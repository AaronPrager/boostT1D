import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ 
        exists: true, 
        message: "An account with this email already exists" 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      exists: false, 
      message: "Email is available" 
    }, { status: 200 });

  } catch (error) {
    console.error("Email check error:", error);
    return NextResponse.json({ 
      message: "Error checking email" 
    }, { status: 500 });
  }
}

