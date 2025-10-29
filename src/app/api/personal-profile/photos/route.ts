import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new NextResponse('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.', { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return new NextResponse('File too large. Maximum size is 5MB.', { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Update user's image in database
    await prisma.user.update({
      where: { email: session.user.email },
      data: { image: base64String }
    });

    return NextResponse.json({
      success: true,
      photoUrl: base64String,
      message: 'Photo uploaded successfully!'
    });

  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to upload photo',
      { status: 500 }
    );
  }
} 