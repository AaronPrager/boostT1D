import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the user's ID from the session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Get the profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return new NextResponse('Profile not found', { status: 404 });
    }

    // Return the diabetes profile data from the data field
    return NextResponse.json(profile.data || {});
  } catch (error) {
    console.error('Error fetching diabetes profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to fetch diabetes profile',
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const diabetesProfileData = await request.json();

    // Get the user's ID from the session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Save or update the diabetes profile data in the data field
    const savedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        data: diabetesProfileData,
      },
      create: {
        userId: user.id,
        data: diabetesProfileData,
      },
    });

    return NextResponse.json(savedProfile);
  } catch (error) {
    console.error('Error saving diabetes profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to save diabetes profile',
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const diabetesProfileData = await request.json();

    // Get the user's ID from the session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Update the diabetes profile data in the data field
    const updatedProfile = await prisma.profile.update({
      where: { userId: user.id },
      data: {
        data: diabetesProfileData,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating diabetes profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to update diabetes profile',
      { status: 500 }
    );
  }
} 