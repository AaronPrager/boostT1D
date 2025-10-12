import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    console.log('[GET /api/personal-profile] Request received');
    const session = await getServerSession(authOptions);
    console.log('[GET /api/personal-profile] Session:', session?.user?.email);
    
    if (!session || !session.user?.email) {
      console.log('[GET /api/personal-profile] Unauthorized - no session');
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
      console.log('[GET /api/personal-profile] User not found');
      return new NextResponse('User not found', { status: 404 });
    }

    // Format the response to match what UserProfileHeader expects
    const personalProfileData = {
      name: user.name,
      email: user.email,
      about: user.profile?.bio || null,
      photo: user.image,
      phone: user.profile?.phoneNumber || null,
      occupation: user.profile?.occupation || null,
      country: user.country,
      state: user.state,
      favoriteActivities: user.profile?.favoriteActivities || null,
      age: user.profile?.age || null,
      yearsSinceDiagnosis: user.profile?.yearsSinceDiagnosis || null,
    };

    console.log('[GET /api/personal-profile] Returning data:', personalProfileData);
    return NextResponse.json(personalProfileData);
  } catch (error) {
    console.error('[GET /api/personal-profile] Error:', error);
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
    console.log('[PUT /api/personal-profile] Request received, photo size:', body.photo?.length || 0);
    const { name, about, phone, occupation, country, state, favoriteActivities, age, yearsSinceDiagnosis, photo } = body;

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
        image: photo !== undefined ? photo : user.image,
      },
    });

    // Update or create profile
    const profileData = {
      bio: about || null,
      phoneNumber: phone || null,
      occupation: occupation || null,
      favoriteActivities: favoriteActivities || null,
      age: age ? Number(age) : null,
      yearsSinceDiagnosis: yearsSinceDiagnosis || null,
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