import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

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

    // Clean up the URL and construct the Nightscout API endpoint
    const baseUrl = nightscoutUrl.trim().replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/entries/sgv?find[date][$gte]=${startDate}&find[date][$lte]=${endDate}&count=1000`;

    console.log('Fetching from Nightscout:', url);

    // Make the request to Nightscout
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

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
  } catch (error) {
    console.error('Error fetching Nightscout data:', error);
    return new NextResponse(
      `Error fetching Nightscout data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
} 