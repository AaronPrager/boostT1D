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
    const user = session?.user as SessionUser | undefined;

    if (!user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        photos: true,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile GET error:", error);
    return new NextResponse("Internal error", { status: 500 });
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

    const profile = await prisma.profile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        bio,
        location,
        website,
        birthDate: birthDate ? new Date(birthDate) : null,
        phoneNumber,
        occupation,
      },
      create: {
        userId: user.id,
        bio,
        location,
        website,
        birthDate: birthDate ? new Date(birthDate) : null,
        phoneNumber,
        occupation,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile PUT error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 