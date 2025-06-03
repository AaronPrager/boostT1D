import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return new NextResponse('Current password and new password are required', { status: 400 });
    }

    if (newPassword.length < 6) {
      return new NextResponse('New password must be at least 6 characters long', { status: 400 });
    }

    // Get the user with current password
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !user.password) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return new NextResponse('Current password is incorrect', { status: 400 });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { email: session.user.email },
      data: { password: hashedNewPassword }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to change password',
      { status: 500 }
    );
  }
} 