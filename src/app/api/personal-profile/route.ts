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

    // Get the user with profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Format the response to match what UserProfileHeader expects
    const personalProfileData = {
      name: user.name,
      email: user.email,
      about: user.profile?.bio || null,
      photo: user.image,
      phone: user.profile?.phoneNumber || null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : (user.profile?.birthDate ? user.profile.birthDate.toISOString().split('T')[0] : null),
      occupation: user.profile?.occupation || null,
      country: user.country,
      state: user.state,
      favoriteActivities: user.profile?.favoriteActivities || null,
      diagnosisAge: user.profile?.diagnosisAge || null,
    };

    return NextResponse.json(personalProfileData);
  } catch (error) {
    console.error('Error fetching personal profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to fetch personal profile',
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { name, about, phone, dateOfBirth, occupation, country, state, favoriteActivities, diagnosisAge, photo } = body;

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Update user fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        country: country || user.country,
        state: state || user.state,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth,
        image: photo !== undefined ? photo : user.image,
      },
    });

    // Update or create profile
    const profileData = {
      bio: about || null,
      phoneNumber: phone || null,
      occupation: occupation || null,
      favoriteActivities: favoriteActivities || null,
      diagnosisAge: diagnosisAge ? Number(diagnosisAge) : null,
      birthDate: dateOfBirth ? new Date(dateOfBirth) : (user.dateOfBirth || user.profile?.birthDate || null),
    };

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: {
        userId: user.id,
        ...profileData,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating personal profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to update personal profile',
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Delete all associated data and the user account
    // Note: The user deletion will cascade and delete all related data
    // due to foreign key constraints and cascade rules in the schema
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to delete user account',
      { status: 500 }
    );
  }
} 