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

    // Return profile + photo
    return NextResponse.json({ ...profile, photo: user.image });
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
    const { bio, location, website, birthDate, phoneNumber, occupation, favoriteActivities, diagnosisAge, photo } = body;

    const profileData = {
      bio,
      location,
      website,
      birthDate: birthDate ? new Date(birthDate) : null,
      phoneNumber,
      occupation,
      favoriteActivities,
      diagnosisAge: diagnosisAge ? Number(diagnosisAge) : null,
    };

    // Update user photo if provided
    if (photo !== undefined) {
      await prisma.user.update({
        where: { email: user.email },
        data: { image: photo },
      });
    }

    const profile = await prisma.profile.upsert({
      where: {
        userId: user.id,
      },
      update: profileData,
      create: {
        userId: user.id,
        ...profileData,
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

    const profileData = await request.json();

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
      update: profileData,
      create: {
        userId: user.id,
        ...profileData,
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

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    // Find the user by email
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }
    // Delete the user and cascade related data if needed
    await prisma.user.delete({ where: { id: user.id } });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete user' }), { status: 500 });
  }
} 