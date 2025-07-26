import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function sha1(token: string): string {
  return crypto.createHash('sha1').update(token).digest('hex');
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true },
    });

            if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }



    if (!user.settings?.nightscoutUrl) {
      return new NextResponse('Nightscout URL not configured. Please set your Nightscout URL in settings.', { status: 400 });
    }

    if (!user.settings?.nightscoutApiToken) {
      return new NextResponse('Nightscout API token not configured. Please go to Diabetes Profile and enter your Nightscout API token in the settings section.', { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return new NextResponse('Start date and end date are required', { status: 400 });
    }

    // Fetch treatments from Nightscout
    const nightscoutUrl = user.settings.nightscoutUrl;
    const apiToken = user.settings.nightscoutApiToken;

    const treatmentsUrl = `${nightscoutUrl}/api/v1/treatments`;
    
    // Use the requested date range
    const queryParams = new URLSearchParams({
      'find[created_at][$gte]': new Date(parseInt(startDate)).toISOString(),
      'find[created_at][$lte]': new Date(parseInt(endDate)).toISOString(),
      'count': '1000', // Adjust as needed
    });
    

    


    const response = await fetch(`${treatmentsUrl}?${queryParams}`, {
      headers: {
        'api-secret': sha1(apiToken),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Nightscout API error:', response.status, response.statusText);
      return new NextResponse('Failed to fetch treatments from Nightscout', { status: response.status });
    }

    const treatments = await response.json();
    

    

    


    // Filter and format treatments - include all relevant treatment types
    const formattedTreatments = treatments
      .filter((treatment: any) => 
        treatment.eventType === 'Bolus' || 
        treatment.eventType === 'SMB' ||
        treatment.eventType === 'Temp Basal' ||
        treatment.eventType === 'Carb Correction' ||
        treatment.eventType === 'Note' ||
        treatment.eventType === 'Site Change' ||
        treatment.eventType === 'Exercise'
      )
      .map((treatment: any) => ({
        id: treatment._id,
        eventType: treatment.eventType,
        insulin: treatment.insulin || 0,
        carbs: treatment.carbs || 0,
        glucose: treatment.glucose || null,
        notes: treatment.notes || '',
        created_at: treatment.created_at,
        timestamp: treatment.timestamp,
        duration: treatment.duration || null,
        percent: treatment.percent || null,
        absolute: treatment.absolute || null,
      }));



    return NextResponse.json({
      treatments: formattedTreatments,
      count: formattedTreatments.length,
      dateRange: { startDate, endDate },
    });

  } catch (error) {
    console.error('Error fetching treatments:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const body = await req.json();
    const { timestamp, type, insulin, carbs, glucoseValue, notes } = body;

    if (!timestamp || !type) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const treatment = await prisma.treatment.create({
      data: {
        userId: user.id,
        timestamp: new Date(timestamp),
        type,
        insulinUnits: insulin || 0,
        carbsGrams: carbs || 0,
        glucoseValue: glucoseValue || null,
        notes: notes || '',
      },
    });

    return NextResponse.json(treatment);
  } catch (error) {
    console.error('Error creating treatment:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 