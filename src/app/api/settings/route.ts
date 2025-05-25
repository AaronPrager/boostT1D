import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    if (!session?.user?.email) {
      console.log('No user email found');
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find user by email since that's what we have from the session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log('No user found for email:', session.user.email);
      return new NextResponse("User not found", { status: 404 });
    }

    console.log('Fetching settings for user:', user.id);
    const settings = await prisma.settings.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!settings) {
      console.log('No settings found, returning defaults');
      return NextResponse.json({
        nightscoutUrl: '',
        lowGlucose: 70.0,
        highGlucose: 180.0,
        timeFormat: '12h'
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings GET error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session in PUT:', session);

    if (!session?.user?.email) {
      console.log('No user email found in PUT');
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find user by email since that's what we have from the session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log('No user found for email:', session.user.email);
      return new NextResponse("User not found", { status: 404 });
    }

    let body;
    try {
      body = await req.json();
      console.log('Raw request body:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new NextResponse("Invalid request body", { status: 400 });
    }

    const { nightscoutUrl, lowGlucose, highGlucose, timeFormat } = body;

    console.log('Parsed settings values:', {
      nightscoutUrl,
      lowGlucose: typeof lowGlucose, // Log the type
      highGlucose: typeof highGlucose, // Log the type
      timeFormat,
    });

    // Validate the settings
    if (nightscoutUrl && !isValidUrl(nightscoutUrl)) {
      console.log('Invalid URL:', nightscoutUrl);
      return new NextResponse("Invalid Nightscout URL", { status: 400 });
    }

    const parsedLowGlucose = Number(lowGlucose);
    const parsedHighGlucose = Number(highGlucose);

    if (isNaN(parsedLowGlucose) || parsedLowGlucose < 40 || parsedLowGlucose > 100) {
      console.log('Invalid low glucose:', lowGlucose);
      return new NextResponse("Low glucose must be between 40 and 100 mg/dL", { status: 400 });
    }

    if (isNaN(parsedHighGlucose) || parsedHighGlucose < 120 || parsedHighGlucose > 300) {
      console.log('Invalid high glucose:', highGlucose);
      return new NextResponse("High glucose must be between 120 and 300 mg/dL", { status: 400 });
    }

    if (parsedLowGlucose >= parsedHighGlucose) {
      console.log('Invalid glucose range:', { low: parsedLowGlucose, high: parsedHighGlucose });
      return new NextResponse("Low glucose must be less than high glucose", { status: 400 });
    }

    if (!timeFormat || !['12h', '24h'].includes(timeFormat)) {
      console.log('Invalid time format:', timeFormat);
      return new NextResponse("Time format must be either '12h' or '24h'", { status: 400 });
    }

    console.log('Attempting to update settings for user:', {
      userId: user.id,
      settings: {
        nightscoutUrl,
        lowGlucose: parsedLowGlucose,
        highGlucose: parsedHighGlucose,
        timeFormat
      }
    });

    try {
      const settings = await prisma.settings.upsert({
        where: {
          userId: user.id,
        },
        update: {
          nightscoutUrl,
          lowGlucose: parsedLowGlucose,
          highGlucose: parsedHighGlucose,
          timeFormat,
        },
        create: {
          userId: user.id,
          nightscoutUrl,
          lowGlucose: parsedLowGlucose,
          highGlucose: parsedHighGlucose,
          timeFormat,
        },
      });

      console.log('Settings updated successfully:', settings);
      return NextResponse.json(settings);
    } catch (dbError) {
      console.error('Database error during settings update:', {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      return new NextResponse(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`, { status: 500 });
    }
  } catch (error) {
    console.error("Settings PUT error:", {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse(`Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
} 