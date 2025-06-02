import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fetch, { RequestInit, AbortError } from 'node-fetch';
import https from 'https';
import crypto from 'crypto';

function sha1(token: string): string {
  return crypto.createHash('sha1').update(token).digest('hex');
}

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
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the date range from query parameters
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // Get user settings including Nightscout URL and API token
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true }
    });

    if (!user || !user.settings) {
      return new NextResponse("User settings not found. Please configure your Nightscout settings first.", { status: 404 });
    }

    const { nightscoutUrl, nightscoutApiToken } = user.settings;

    if (!nightscoutUrl) {
      return new NextResponse("Nightscout URL not configured. Please set your Nightscout URL in settings.", { status: 400 });
    }

    // Clean up the URL and ensure HTTPS
    let baseUrl = nightscoutUrl.trim().replace(/\/$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }

    // Construct the Nightscout API endpoint
    const url = `${baseUrl}/api/v1/entries/sgv?find[date][$gte]=${startDate}&find[date][$lte]=${endDate}&count=1000`;

    console.log('Fetching from Nightscout:', url);

    const timeoutMs = 30000; // 30 second timeout

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'BoostT1D/1.0',
      };

      // Add API token if provided
      if (nightscoutApiToken) {
        headers['api-secret'] = sha1(nightscoutApiToken);
      }

      const fetchOptions: RequestInit = {
        headers,
        agent,
        compress: true, // Enable compression
        follow: 5, // Follow up to 5 redirects
        timeout: timeoutMs,
      };

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.error('Nightscout API error:', {
          status: response.status,
          statusText: response.statusText,
        });
        
        if (response.status === 401) {
          return new NextResponse("Unauthorized access to Nightscout. Please check your API token.", { status: 401 });
        }
        
        return new NextResponse(`Nightscout API error: ${response.statusText}`, { status: response.status });
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return new NextResponse("Invalid data format received from Nightscout", { status: 500 });
      }

      return NextResponse.json(data);
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new NextResponse("Request timeout while fetching from Nightscout", { status: 504 });
      }
      // Type guard for Node.js system errors that have a code property
      if (fetchError instanceof Error && 'code' in fetchError && 
          (fetchError.code === 'ECONNRESET' || fetchError.code === 'UND_ERR_SOCKET')) {
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