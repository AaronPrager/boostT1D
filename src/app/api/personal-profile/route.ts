import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

interface PersonalProfileData {
  name?: string;
  about?: string;
  photo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phone?: string;
  dateOfBirth?: string;
  diagnosisAge?: number;
  favoriteActivities?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

// Type guard to check if data is an object
function isObject(data: unknown): data is Record<string, unknown> {
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}

// Helper function to safely get string value
function getStringValue(obj: Record<string, unknown> | null | undefined, key: string): string {
  return isObject(obj) && typeof obj[key] === 'string' ? obj[key] as string : '';
}

// Helper function to safely get number value
function getNumberValue(obj: Record<string, unknown> | null | undefined, key: string): number | undefined {
  if (isObject(obj) && typeof obj[key] === 'number') {
    return obj[key] as number;
  }
  if (isObject(obj) && typeof obj[key] === 'string') {
    const parsed = parseInt(obj[key] as string, 10);
    return !isNaN(parsed) ? parsed : undefined;
  }
  return undefined;
}

// Helper function to safely get object value
function getObjectValue(obj: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> {
  return isObject(obj) && isObject(obj[key]) ? obj[key] as Record<string, unknown> : {};
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true
      }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Safely extract personal profile data from the profile JSON or user table
    const profileData = user.profile?.data as Prisma.JsonObject | null;

    const personalProfile: PersonalProfileData = {
      name: user.name || '',
      about: getStringValue(profileData, 'about'),
      photo: getStringValue(profileData, 'photo') || user.image || '',
      address: getObjectValue(profileData, 'address'),
      phone: getStringValue(profileData, 'phone'),
      dateOfBirth: getStringValue(profileData, 'dateOfBirth'),
      diagnosisAge: getNumberValue(profileData, 'diagnosisAge'),
      favoriteActivities: getStringValue(profileData, 'favoriteActivities'),
      emergencyContact: getObjectValue(profileData, 'emergencyContact')
    };

    return NextResponse.json(personalProfile);
  } catch (error) {
    console.error('Error fetching personal profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to fetch personal profile',
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const personalProfileData: PersonalProfileData = await request.json();

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true
      }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Update user name and image in the User table
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: personalProfileData.name,
        image: personalProfileData.photo
      }
    });

    // Get existing profile data to preserve diabetes-related settings
    const existingProfileData = user.profile?.data as Prisma.JsonObject | null;
    const safeExistingData: Record<string, unknown> = isObject(existingProfileData) ? existingProfileData : {};

    // Merge personal profile data with existing profile data
    const updatedProfileData: Record<string, unknown> = {
      ...safeExistingData,
      about: personalProfileData.about,
      photo: personalProfileData.photo,
      address: personalProfileData.address,
      phone: personalProfileData.phone,
      dateOfBirth: personalProfileData.dateOfBirth,
      diagnosisAge: personalProfileData.diagnosisAge,
      favoriteActivities: personalProfileData.favoriteActivities,
      emergencyContact: personalProfileData.emergencyContact
    };

    // Upsert the profile
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        data: updatedProfileData as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        data: updatedProfileData as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        name: personalProfileData.name,
        about: personalProfileData.about,
        photo: personalProfileData.photo,
        address: personalProfileData.address,
        phone: personalProfileData.phone,
        dateOfBirth: personalProfileData.dateOfBirth,
        diagnosisAge: personalProfileData.diagnosisAge,
        favoriteActivities: personalProfileData.favoriteActivities,
        emergencyContact: personalProfileData.emergencyContact
      }
    });
  } catch (error) {
    console.error('Error updating personal profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to update personal profile',
      { status: 500 }
    );
  }
} 