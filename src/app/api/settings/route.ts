import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the user's settings
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // If no settings exist, create default settings
    if (!user.settings) {
      const settings = await prisma.settings.create({
        data: {
          userId: user.id,
          nightscoutUrl: '',
          nightscoutApiToken: '',
          lowGlucose: 70,
          highGlucose: 180
        }
      });
      return NextResponse.json(settings);
    }

    return NextResponse.json(user.settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to fetch settings',
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('Session in PUT:', { session });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('Fetching settings for user:', session.user.email);

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      console.log('No user found for email:', session.user.email);
      return new NextResponse('User not found', { status: 404 });
    }

    // Update or create settings
    const settings = await prisma.settings.upsert({
      where: {
        userId: user.id
      },
      update: {
        nightscoutUrl: body.nightscoutUrl,
        nightscoutApiToken: body.nightscoutApiToken || '',
        lowGlucose: body.lowGlucose || 70,
        highGlucose: body.highGlucose || 180
      },
      create: {
        userId: user.id,
        nightscoutUrl: body.nightscoutUrl || '',
        nightscoutApiToken: body.nightscoutApiToken || '',
        lowGlucose: body.lowGlucose || 70,
        highGlucose: body.highGlucose || 180
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to update settings',
      { status: 500 }
    );
  }
} 