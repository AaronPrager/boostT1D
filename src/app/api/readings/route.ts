import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

type Reading = {
  id?: string;
  timestamp: Date;
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
  timestamp: Date;
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
          r.timestamp = new Date(r.date); // Use the date field from Nightscout
        }

        if (!r.timestamp && !r.date) {
          console.warn('Missing timestamp and date in reading:', r);
          return false;
        }

        if (!r.sgv || typeof r.sgv !== 'number') {
          console.warn('Invalid or missing sgv value:', r);
          return false;
        }

        // Convert timestamp to Date object if it's not already
        if (!(r.timestamp instanceof Date)) {
          r.timestamp = new Date(r.timestamp);
        }

        if (isNaN(r.timestamp.getTime())) {
          console.warn('Invalid timestamp/date:', r.timestamp, 'Original:', r.date);
          return false;
        }

        // Add source if not present
        if (!r.source) {
          r.source = r.device === 'unknown' ? 'nightscout' : 'manual';
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

    // Check if readings already exist for these timestamps
    const existingReadings = await prisma.glucoseReading.findMany({
      where: {
        userId: user.id,
        timestamp: {
          in: validReadings.map((r: Reading) => r.timestamp)
        }
      }
    });

    const existingTimestamps = new Set(existingReadings.map((r: GlucoseReading) => r.timestamp.getTime()));

    // Filter out readings that already exist
    const newReadings = validReadings.filter((reading: Reading) => 
      !existingTimestamps.has(reading.timestamp.getTime())
    );

    if (newReadings.length === 0) {
      return NextResponse.json({ message: 'No new readings to store' });
    }

    // Create new readings
    const createdReadings = await prisma.glucoseReading.createMany({
      data: newReadings.map((reading: Reading) => {
        // Ensure source is either 'manual' or 'nightscout'
        const source = reading.source === 'manual' || reading.source === 'nightscout' 
          ? reading.source 
          : 'nightscout';

        return {
          userId: user.id,
          timestamp: reading.timestamp,
          sgv: reading.sgv,
          direction: reading.direction || null,
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

    // Convert Unix timestamps to Date objects
    const startDate = startDateParam ? new Date(Number(startDateParam)) : undefined;
    const endDate = endDateParam ? new Date(Number(endDateParam)) : undefined;

    // Validate dates
    if (startDateParam && isNaN(startDate!.getTime())) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
    }
    if (endDateParam && isNaN(endDate!.getTime())) {
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
      gte: startDate,
      lte: endDate,
    };

    // Fetch Nightscout readings if source is 'nightscout' or 'combined'
    if (source === 'nightscout' || source === 'combined' || !source) {
      console.log('Fetching Nightscout readings with filter:', {
        userId: user.id,
        source: 'nightscout',
        timeFilter
      });

      const nightscoutReadings = await prisma.glucoseReading.findMany({
        where: {
          userId: user.id,
          source: 'nightscout',
          timestamp: timeFilter,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      console.log('Found Nightscout readings:', nightscoutReadings.length);
      allReadings = [...allReadings, ...nightscoutReadings];
    }

    // Fetch Manual readings if source is 'manual' or 'combined'
    if (source === 'manual' || source === 'combined' || !source) {
      console.log('Fetching manual readings with filter:', {
        userId: user.id,
        source: 'manual',
        timeFilter
      });

      // Get manual glucose readings
      const manualReadings = await prisma.glucoseReading.findMany({
        where: {
          userId: user.id,
          source: 'manual',
          timestamp: timeFilter,
        },
        orderBy: {
          timestamp: 'desc',
        },
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
      const treatmentReadings: Reading[] = treatments.map((t: DBTreatment) => ({
        id: `t_${t.id}`,
        timestamp: t.timestamp,
        sgv: t.glucoseValue,
        direction: null,
        source: 'manual',
        userId: t.userId,
      }));

      allReadings = [...allReadings, ...manualReadings, ...treatmentReadings];
    }

    // Sort all readings by timestamp, most recent first
    const sortedReadings = allReadings.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

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