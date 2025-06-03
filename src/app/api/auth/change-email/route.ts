import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { newEmail } = await request.json();

    if (!newEmail || !newEmail.trim()) {
      return new NextResponse('New email is required', { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new NextResponse('Invalid email format', { status: 400 });
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    });

    if (existingUser && existingUser.email !== session.user.email) {
      return new NextResponse('Email is already in use', { status: 409 });
    }

    // Update user email
    await prisma.user.update({
      where: { email: session.user.email },
      data: { email: newEmail }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing email:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to change email',
      { status: 500 }
    );
  }
} 