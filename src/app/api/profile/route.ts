import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

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

    return NextResponse.json(profile.data);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to fetch profile',
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    if (!user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { bio, location, website, birthDate, phoneNumber, occupation } = body;

    const profileData = {
      bio,
      location,
      website,
      birthDate: birthDate ? new Date(birthDate) : null,
      phoneNumber,
      occupation,
    };

    const profile = await prisma.profile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        data: profileData,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        data: profileData,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile PUT error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const profile = await request.json();

    // Get the user's ID from the session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Save or update the profile
    const savedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        data: profile,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        data: profile,
      },
    });

    return NextResponse.json(savedProfile);
  } catch (error) {
    console.error('Error saving profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to save profile',
      { status: 500 }
    );
  }
} 