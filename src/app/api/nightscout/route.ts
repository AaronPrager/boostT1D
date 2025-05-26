import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import fetch, { RequestInit } from 'node-fetch';
import https from 'https';

// Create a custom HTTPS agent with better timeout and connection settings
const agent = new https.Agent({
  rejectUnauthorized: false, // Allow self-signed certificates
  timeout: 30000, // 30 seconds
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 10
});

export async function GET(req: Request) {
  try {
    // Get the URL and date range from query parameters
    const { searchParams } = new URL(req.url);
    const nightscoutUrl = searchParams.get('url');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!nightscoutUrl || !startDate || !endDate) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // Clean up the URL and ensure HTTPS
    let baseUrl = nightscoutUrl.trim().replace(/\/$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }

    // Construct the Nightscout API endpoint
    const url = `${baseUrl}/api/v1/entries/sgv?find[date][$gte]=${startDate}&find[date][$lte]=${endDate}&count=1000`;

    console.log('Fetching from Nightscout:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const fetchOptions: RequestInit = {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BoostT1D/1.0',
        },
        agent,
        signal: controller.signal as any, // Type assertion to avoid compatibility issues
        compress: true, // Enable compression
        follow: 5, // Follow up to 5 redirects
      };

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Nightscout API error:', {
          status: response.status,
          statusText: response.statusText,
        });
        return new NextResponse(`Nightscout API error: ${response.statusText}`, { status: response.status });
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return new NextResponse("Invalid data format received from Nightscout", { status: 500 });
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return new NextResponse("Request timeout while fetching from Nightscout", { status: 504 });
      }
      if (fetchError.code === 'ECONNRESET' || fetchError.code === 'UND_ERR_SOCKET') {
        return new NextResponse("Connection reset by Nightscout server - please try again", { status: 503 });
      }
      throw fetchError; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error fetching Nightscout data:', error);
    return new NextResponse(
      `Error fetching Nightscout data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
} 