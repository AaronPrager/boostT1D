import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      debug: {
        userImage: user.image,
        userName: user.name,
        profileExists: !!user.profile,
        profileData: user.profile?.data,
        rawProfileData: JSON.stringify(user.profile?.data, null, 2)
      }
    });
  } catch (error) {
    console.error('Debug profile error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
} 