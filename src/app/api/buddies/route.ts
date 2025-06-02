import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { findBuddyMatches } from "@/lib/buddyMatching";

// Type guard to check if data is an object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(data: any): data is Record<string, any> {
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}

// Helper function to safely get string value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStringValue(obj: any, key: string): string {
  return isObject(obj) && typeof obj[key] === 'string' ? obj[key] : '';
}

// Helper function to safely get number value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNumberValue(obj: any, key: string): number | undefined {
  if (isObject(obj) && typeof obj[key] === 'number') {
    return obj[key];
  }
  if (isObject(obj) && typeof obj[key] === 'string') {
    const parsed = parseInt(obj[key], 10);
    return !isNaN(parsed) ? parsed : undefined;
  }
  return undefined;
}

// Helper function to safely get object value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getObjectValue(obj: any, key: string): Record<string, any> {
  return isObject(obj) && isObject(obj[key]) ? obj[key] : {};
}

// Add BuddyConnection type for connection status
// Minimal type for linter compliance
interface BuddyConnection {
  id: string;
  requesterId: string;
  targetId: string;
  status: string;
}

interface UserProfile {
  id: string;
  name: string;
  dateOfBirth?: string;
  diagnosisAge?: number;
  favoriteActivities?: string;
  about?: string;
  photo?: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
  };
  // Contact info - only shown for approved connections
  email?: string;
  phone?: string;
}

// Transform Prisma user data to UserProfile
function transformUserProfile(user: Record<string, unknown>, includeContactInfo = false): UserProfile {
  // Safely access profile data with proper type checking
  const userProfile = isObject(user.profile) ? user.profile : {};
  const profileData = isObject(userProfile.data) ? userProfile.data : {};
  
  const profile: UserProfile = {
    id: getStringValue(user, 'id'),
    name: getStringValue(user, 'name') || 'Anonymous User',
    dateOfBirth: getStringValue(profileData, 'dateOfBirth'),
    diagnosisAge: getNumberValue(profileData, 'diagnosisAge'),
    favoriteActivities: getStringValue(profileData, 'favoriteActivities'),
    about: getStringValue(profileData, 'about'),
    photo: getStringValue(profileData, 'photo'),
    address: {
      country: getStringValue(getObjectValue(profileData, 'address'), 'country'),
      state: getStringValue(getObjectValue(profileData, 'address'), 'state'),
      city: getStringValue(getObjectValue(profileData, 'address'), 'city'),
    }
  };

  // Only include contact information for approved connections
  if (includeContactInfo) {
    profile.email = getStringValue(user, 'email');
    profile.phone = getStringValue(profileData, 'phone');
  }

  return profile;
}

// GET /api/buddies - Find potential buddy matches
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user's profile
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true
      }
    });

    if (!currentUser || !currentUser.profile) {
      return NextResponse.json({ 
        matches: [],
        message: "Please complete your profile to find buddy matches" 
      });
    }

    // Transform current user data
    const currentUserProfile = transformUserProfile(currentUser);

    // Get all other users with profiles (excluding current user)
    const otherUsers = await prisma.user.findMany({
      where: {
        id: { not: session.user.id },
        profile: { isNot: null }
      },
      include: {
        profile: true
      }
    });

    if (otherUsers.length === 0) {
      return NextResponse.json({ 
        matches: [],
        message: "No other users found. Be the first to connect with the community!" 
      });
    }

    // Transform other users data
    const otherUserProfiles = otherUsers.map(user => transformUserProfile(user, false));

    // Find matches using the buddy matching algorithm
    const matches = findBuddyMatches(currentUserProfile, otherUserProfiles);

    // Get existing connections to show status
    let existingConnections: BuddyConnection[] = [];
    try {
      existingConnections = await prisma.buddyConnection.findMany({
        where: {
          OR: [
            { requesterId: session.user.id },
            { targetId: session.user.id }
          ]
        }
      });
    } catch {
      console.log("BuddyConnection operations not available, continuing without connection status");
      existingConnections = [];
    }

    // Add connection status to matches
    const matchesWithStatus = matches.map(match => {
      const connection = existingConnections.find((conn: BuddyConnection) => 
        (conn.requesterId === session.user.id && conn.targetId === match.user.id) ||
        (conn.targetId === session.user.id && conn.requesterId === match.user.id)
      );

      let connectionStatus = null;
      let userWithContactInfo = match.user;

      if (connection) {
        connectionStatus = {
          type: connection.requesterId === session.user.id ? 'sent' as const : 'received' as const,
          status: connection.status,
          id: connection.id
        };

        // If connection is approved, include contact information
        if (connection.status === 'approved') {
          const fullUser = otherUsers.find(u => u.id === match.user.id);
          if (fullUser) {
            userWithContactInfo = transformUserProfile(fullUser, true);
          }
        }
      }

      return {
        ...match,
        user: userWithContactInfo,
        connectionStatus
      };
    });

    return NextResponse.json({ 
      matches: matchesWithStatus,
      total: matchesWithStatus.length 
    });

  } catch (error) {
    console.error("Error finding buddy matches:", error);
    return NextResponse.json({ 
      error: "Failed to find buddy matches" 
    }, { status: 500 });
  }
} 