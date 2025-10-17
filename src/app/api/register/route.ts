import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function POST(req: Request) {
  try {

    const body = await req.json();

    const { email, password, name, photo, country, state, age, yearsSinceDiagnosis, about, phone, favoriteActivities, nightscoutUrl, nightscoutApiToken, lowGlucose, highGlucose } = body;

    // Validate required fields
    if (!email || !password || !name || !country || !age) {
      const missingFields = [];
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      if (!name) missingFields.push('name');
      if (!country) missingFields.push('country');
      if (!age) missingFields.push('age');

      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {

      return NextResponse.json({ message: "Invalid email format" }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {

      return NextResponse.json({ message: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // Validate name length
    if (name.length < 2) {

      return NextResponse.json({ message: "Name must be at least 2 characters long" }, { status: 400 });
    }

    // Validate country
    if (!country || country.trim() === '') {

      return NextResponse.json({ message: "Country is required" }, { status: 400 });
    }

    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13) {

      return NextResponse.json({ message: "You must be at least 13 years old to register" }, { status: 400 });
    }

    if (ageNum > 120) {

      return NextResponse.json({ message: "Please enter a valid age" }, { status: 400 });
    }

    // Check if user already exists

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {

      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    // Hash password

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Test database connection

      await prisma.$connect();

      // Create user with settings from onboarding
      const user = await prisma.user.create({
        data: {
          email,
          name,
          image: photo || null,
          country,
          state,
          password: hashedPassword,
          emailConfirmed: true, // Auto-confirm email for development
          emailVerified: new Date(), // Auto-verify email for development
          settings: {
            create: {
              nightscoutUrl: nightscoutUrl || "",
              nightscoutApiToken: nightscoutApiToken || "",
              lowGlucose: lowGlucose || 70.0,
              highGlucose: highGlucose || 180.0,
            },
          },
        },
        include: {
          settings: true,
        },
      });

      // Create the profile with extra fields including age and yearsSinceDiagnosis
      await prisma.profile.create({
        data: {
          userId: user.id,
          bio: about || null,
          phoneNumber: phone || null,
          favoriteActivities: favoriteActivities || null,
          age: age ? Number(age) : null,
          yearsSinceDiagnosis: yearsSinceDiagnosis || null,
        },
      });

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error('Prisma error details:', {
          name: error.name,
          code: error.code,
          meta: error.meta,
          message: error.message,
          stack: error.stack
        });
        return NextResponse.json({ 
          message: "Database error while creating user", 
          error: {
            code: error.code,
            message: error.message,
            meta: error.meta
          }
        }, { status: 500 });
      }
      // Handle other types of errors
      const err = error as Error;
      console.error('Unknown database error:', {
        error: err,
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      return NextResponse.json({ 
        message: "Error creating user",
        error: err.message || "Unknown error"
      }, { status: 500 });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
      return NextResponse.json({ message: error.message, stack: error.stack }, { status: 500 });
    }
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
} 