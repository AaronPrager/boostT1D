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

type DBTreatment = {
  id: string;
  timestamp: Date;
  glucoseValue: number;
  type: string;
  userId: string;
};

type GlucoseReading = {
  id: string;
  date: Date;
  sgv: number;
  direction: string | null;
  source: string;
  userId: string;
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
    const validReadings = data.readings.filter((r: any) => {
      try {
        if (!r || typeof r !== 'object') {
          console.warn('Invalid reading object:', r);
          return false;
        }

        // Handle Nightscout format (has date and dateString fields)
        if (r.date && !r.timestamp) {
          const rawDate = r.date;
          r.date = new Date(r.date); // Use the date field from Nightscout
          console.log('Processing Nightscout reading:', { 
            rawData: r,
            processedDate: r.date,
            sgv: r.sgv,
            direction: r.direction
          });
        } else if (r.timestamp && !r.date) {
          const rawTimestamp = r.timestamp;
          r.date = new Date(r.timestamp); // Convert timestamp to date
          console.log('Processing Nightscout reading:', {
            rawData: r,
            processedDate: r.date,
            sgv: r.sgv,
            direction: r.direction
          });
        }

        if (!r.date) {
          console.warn('Missing date in reading:', r);
          return false;
        }

        if (!r.sgv || typeof r.sgv !== 'number') {
          console.warn('Invalid or missing sgv value:', r);
          return false;
        }

        // Convert date to Date object if it's not already
        if (!(r.date instanceof Date)) {
          r.date = new Date(r.date);
        }

        if (isNaN(r.date.getTime())) {
          console.warn('Invalid date:', r.date, 'Original:', r.timestamp);
          return false;
        }

        // Add source if not present
        if (!r.source) {
          r.source = 'nightscout'; // Default to nightscout for Nightscout data
        }

        // Map Nightscout direction to our format
        if (r.direction === 'FortyFiveDown' || r.direction === 'Slight Fall') r.direction = 'FortyFiveDown';
        if (r.direction === 'FortyFiveUp' || r.direction === 'Slight Rise') r.direction = 'FortyFiveUp';
        if (r.direction === 'SingleDown' || r.direction === 'Fall') r.direction = 'SingleDown';
        if (r.direction === 'SingleUp' || r.direction === 'Rise') r.direction = 'SingleUp';
        if (r.direction === 'DoubleDown' || r.direction === 'Rapid Fall') r.direction = 'DoubleDown';
        if (r.direction === 'DoubleUp' || r.direction === 'Rapid Rise') r.direction = 'DoubleUp';
        if (r.direction === 'Flat') r.direction = 'Flat';
        if (!r.direction) r.direction = 'NONE';

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

    const existingTimestamps = new Set(existingReadings.map((r: any) => r.date.getTime()));

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
      const timeA = a.date?.getTime() || (a as any).date?.getTime();
      const timeB = b.date?.getTime() || (b as any).date?.getTime();
      
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