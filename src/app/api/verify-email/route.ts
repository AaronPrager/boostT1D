import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Update the user to mark email as confirmed
    await prisma.user.update({
      where: { email },
      data: {
        emailConfirmed: true,
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({ 
      message: "Email verified successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
} 