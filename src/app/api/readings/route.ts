import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

type Reading = {
  id?: string;
  date: Date;
  sgv: number;
  direction?: string | null;
  source: 'manual' | 'nightscout';
  userId?: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const data = await request.json();
    console.log('Received data structure:', {
      hasReadings: !!data.readings,
      readingsLength: data.readings?.length,
      sampleReading: data.readings?.[0],
    });

    if (!data.readings || !Array.isArray(data.readings)) {
      console.error('Invalid data structure:', data);
      return NextResponse.json({ error: 'Invalid data structure: readings array is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate timestamps and convert to Date objects
    const validReadings = data.readings.filter((r: unknown) => {
      try {
        if (!r || typeof r !== 'object') {
          console.warn('Invalid reading object:', r);
          return false;
        }
        // Type assertion for reading
        const reading = r as Partial<Reading> & { timestamp?: string | number };
        // Handle Nightscout format (has date and dateString fields)
        if (reading.date && !reading.timestamp) {
          reading.date = new Date(reading.date);
          console.log('Processing Nightscout reading:', { 
            rawData: reading,
            processedDate: reading.date,
            sgv: reading.sgv,
            direction: reading.direction
          });
        } else if (reading.timestamp && !reading.date) {
          reading.date = new Date(reading.timestamp);
          console.log('Processing Nightscout reading:', {
            rawData: reading,
            processedDate: reading.date,
            sgv: reading.sgv,
            direction: reading.direction
          });
        }

        if (!reading.date) {
          console.warn('Missing date in reading:', reading);
          return false;
        }

        if (!reading.sgv || typeof reading.sgv !== 'number') {
          console.warn('Invalid or missing sgv value:', reading);
          return false;
        }

        // Convert date to Date object if it's not already
        if (!(reading.date instanceof Date)) {
          reading.date = new Date(reading.date);
        }

        if (isNaN(reading.date.getTime())) {
          console.warn('Invalid date:', reading.date, 'Original:', reading.timestamp);
          return false;
        }

        // Add source if not present
        if (!reading.source) {
          reading.source = 'nightscout'; // Default to nightscout for Nightscout data
        }

        // Map Nightscout direction to our format
        if (reading.direction === 'FortyFiveDown' || reading.direction === 'Slight Fall') reading.direction = 'FortyFiveDown';
        if (reading.direction === 'FortyFiveUp' || reading.direction === 'Slight Rise') reading.direction = 'FortyFiveUp';
        if (reading.direction === 'SingleDown' || reading.direction === 'Fall') reading.direction = 'SingleDown';
        if (reading.direction === 'SingleUp' || reading.direction === 'Rise') reading.direction = 'SingleUp';
        if (reading.direction === 'DoubleDown' || reading.direction === 'Rapid Fall') reading.direction = 'DoubleDown';
        if (reading.direction === 'DoubleUp' || reading.direction === 'Rapid Rise') reading.direction = 'DoubleUp';
        if (reading.direction === 'Flat') reading.direction = 'Flat';
        if (!reading.direction) reading.direction = 'NONE';

        return true;
      } catch (error) {
        console.warn('Error processing reading:', error, 'Reading:', r);
        return false;
      }
    });

    if (validReadings.length === 0) {
      return NextResponse.json({ error: 'No valid readings provided' }, { status: 400 });
    }

    // Check if readings already exist for these dates
    const existingReadings = await prisma.reading.findMany({
      where: {
        userId: user.id,
        date: {
          in: validReadings.map((r: Reading) => r.date)
        }
      }
    });

    const existingTimestamps = new Set(existingReadings.map((r: { date: Date }) => r.date.getTime()));

    // Filter out readings that already exist
    const newReadings = validReadings.filter((reading: Reading) => 
      !existingTimestamps.has(reading.date.getTime())
    );

    if (newReadings.length === 0) {
      return NextResponse.json({ message: 'No new readings to store' });
    }

    // Create new readings
    const createdReadings = await prisma.reading.createMany({
      data: newReadings.map((reading: Reading) => {
        // Ensure source is set correctly
        const source = reading.source || 'nightscout';

        console.log('Creating reading:', {
          date: reading.date,
          sgv: reading.sgv,
          direction: reading.direction,
          source: source,
          originalSource: reading.source
        });

        return {
          userId: user.id,
          date: reading.date,
          sgv: reading.sgv,
          direction: reading.direction || null,
          type: 'sgv',
          source: source
        };
      })
    });

    console.log(`Successfully stored ${createdReadings.count} readings`);
    return NextResponse.json({
      message: `Stored ${createdReadings.count} new readings`,
      count: createdReadings.count
    });
  } catch (error) {
    console.error('Failed to store readings:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to store readings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const source = searchParams.get('source'); // 'manual', 'nightscout', or 'combined'

    // Convert Unix timestamps to Date objects with validation
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      const startTimestamp = Number(startDateParam);
      if (!isNaN(startTimestamp)) {
        startDate = new Date(startTimestamp);
      }
    }

    if (endDateParam) {
      const endTimestamp = Number(endDateParam);
      if (!isNaN(endTimestamp)) {
        endDate = new Date(endTimestamp);
      }
    }

    // Validate dates
    if (startDateParam && (!startDate || isNaN(startDate.getTime()))) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
    }
    if (endDateParam && (!endDate || isNaN(endDate.getTime()))) {
      return NextResponse.json({ error: 'Invalid end date' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let allReadings: Reading[] = [];

    // Time range filter for both queries
    const timeFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };

    // Calculate appropriate limit based on time range
    let queryLimit = 1000; // Default for short periods
    if (startDate && endDate) {
      const timeDiffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (timeDiffDays >= 7) {
        queryLimit = 5000; // For week+ views, allow more readings
      }
      if (timeDiffDays >= 30) {
        queryLimit = 10000; // For month+ views, allow even more readings
      }
    }

    // Fetch Nightscout readings if source is 'nightscout' or 'combined'
    if (source === 'nightscout' || source === 'combined' || !source) {
      console.log('Fetching Nightscout readings with filter:', {
        userId: user.id,
        source: 'nightscout',
        timeFilter,
        timeFilterKeys: Object.keys(timeFilter),
        hasTimeFilter: Object.keys(timeFilter).length > 0,
        queryLimit
      });

      const nightscoutReadings = await prisma.reading.findMany({
        where: {
          userId: user.id,
          source: 'nightscout',
          ...(Object.keys(timeFilter).length > 0 && { date: timeFilter }),
        },
        orderBy: {
          date: 'desc',
        },
        take: queryLimit,
      });

      console.log('Found Nightscout readings:', {
        count: nightscoutReadings.length,
        sample: nightscoutReadings[0],
        timeRange: timeFilter
      });
      allReadings = [...allReadings, ...nightscoutReadings as Reading[]];
    }

    // Fetch Manual readings if source is 'manual' or 'combined'
    if (source === 'manual' || source === 'combined' || !source) {
      console.log('Fetching manual readings with filter:', {
        userId: user.id,
        source: 'manual',
        timeFilter
      });

      // Get manual glucose readings
      const manualReadings = await prisma.reading.findMany({
        where: {
          userId: user.id,
          source: 'manual',
          ...(Object.keys(timeFilter).length > 0 && { date: timeFilter }),
        },
        orderBy: {
          date: 'desc',
        },
        take: queryLimit,
      });

      console.log('Found manual readings:', manualReadings.length);

      // Get BG treatments
      const treatments = await prisma.treatment.findMany({
        where: {
          userId: user.id,
          type: 'bg',
          glucoseValue: { not: null },
          timestamp: timeFilter,
        },
        orderBy: {
          timestamp: 'desc',
        },
        select: {
          id: true,
          timestamp: true,
          glucoseValue: true,
          type: true,
          userId: true,
        },
      });

      console.log('Found BG treatments:', treatments.length);

      // Convert treatments to reading format
      const treatmentReadings: Reading[] = treatments
        .filter(t => t.glucoseValue !== null)
        .map((t) => ({
        id: `t_${t.id}`,
        date: t.timestamp,
          sgv: t.glucoseValue!,
        direction: null,
          source: 'manual' as const,
        userId: t.userId,
      }));

      allReadings = [...allReadings, ...manualReadings as Reading[], ...treatmentReadings];
    }

    // Sort all readings by timestamp, most recent first
    const sortedReadings = allReadings.sort((a, b) => {
      const timeA = a.date?.getTime();
      const timeB = b.date?.getTime();
      if (!timeA || !timeB) {
        console.warn('Invalid timestamp in reading:', !timeA ? a : b);
        return 0;
      }
      return timeB - timeA;
    });

    console.log('Total readings after filtering:', sortedReadings.length);
    return NextResponse.json(sortedReadings);
  } catch (error) {
    console.error('Failed to fetch readings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch readings' },
      { status: 500 }
    );
  }
} 