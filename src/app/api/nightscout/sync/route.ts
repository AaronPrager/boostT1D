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

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('Starting Nightscout sync for user:', session.user.email);

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

    // Fetch data from the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Clean up the URL and ensure HTTPS
    let baseUrl = nightscoutUrl.trim().replace(/\/$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }

    // Construct the Nightscout API endpoint
    const url = `${baseUrl}/api/v1/entries/sgv?find[date][$gte]=${startDate.getTime()}&find[date][$lte]=${endDate.getTime()}&count=2000`;

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
        compress: true,
        follow: 5,
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

      const nightscoutData = await response.json();

      if (!Array.isArray(nightscoutData)) {
        return new NextResponse("Invalid data format received from Nightscout", { status: 500 });
      }

      console.log(`Fetched ${nightscoutData.length} readings from Nightscout`);

      // Transform Nightscout data to our format
      const readings = nightscoutData.map((reading: any) => ({
        date: new Date(reading.date || reading.dateString),
        sgv: reading.sgv,
        direction: reading.direction || 'NONE',
        source: 'nightscout' as const,
        type: 'sgv'
      })).filter((reading: any) => {
        // Validate the reading
        if (!reading.date || isNaN(reading.date.getTime())) {
          console.warn('Invalid date in reading:', reading);
          return false;
        }
        if (!reading.sgv || typeof reading.sgv !== 'number') {
          console.warn('Invalid or missing sgv value:', reading);
          return false;
        }
        return true;
      });

      if (readings.length === 0) {
        return NextResponse.json({ 
          message: 'No valid readings found in Nightscout data',
          fetchedCount: nightscoutData.length,
          storedCount: 0 
        });
      }

      // Check if readings already exist for these dates
      const existingReadings = await prisma.glucoseReading.findMany({
        where: {
          userId: user.id,
          timestamp: {
            in: readings.map((r: any) => r.date)
          }
        }
      });

      const existingTimestamps = new Set(existingReadings.map(r => r.timestamp.getTime()));

      // Filter out readings that already exist
      const newReadings = readings.filter((reading: any) => 
        !existingTimestamps.has(reading.date.getTime())
      );

      console.log(`Found ${newReadings.length} new readings to store out of ${readings.length} total`);

      if (newReadings.length === 0) {
        return NextResponse.json({ 
          message: 'No new readings to store - all data is up to date',
          fetchedCount: nightscoutData.length,
          storedCount: 0 
        });
      }

      // Create new readings in the database
      const createdReadings = await prisma.glucoseReading.createMany({
        data: newReadings.map((reading: any) => ({
          id: `ns_${reading.date.getTime()}_${reading.sgv}_${crypto.randomUUID()}`,
          userId: user.id,
          timestamp: reading.date,
          sgv: reading.sgv,
          direction: reading.direction,
          source: reading.source
        }))
      });

      console.log(`Successfully stored ${createdReadings.count} new readings`);

      return NextResponse.json({
        message: `Successfully synced ${createdReadings.count} new readings from Nightscout`,
        fetchedCount: nightscoutData.length,
        storedCount: createdReadings.count,
        existingCount: readings.length - newReadings.length
      });

    } catch (fetchError: unknown) {
      console.error('Error during Nightscout fetch:', fetchError);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new NextResponse("Request timeout while fetching from Nightscout", { status: 504 });
      }
      
      if (fetchError instanceof Error && 'code' in fetchError && 
          (fetchError.code === 'ECONNRESET' || fetchError.code === 'UND_ERR_SOCKET')) {
        return new NextResponse("Connection reset by Nightscout server - please try again", { status: 503 });
      }
      
      throw fetchError; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error syncing Nightscout data:', error);
    return new NextResponse(
      `Error syncing Nightscout data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
} 