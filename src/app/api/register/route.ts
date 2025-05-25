import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function POST(req: Request) {
  try {
    console.log('Starting registration process...');
    
    const body = await req.json();
    console.log('Received registration data:', {
      email: body.email,
      name: body.name,
      hasPassword: !!body.password
    });

    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      const missingFields = [];
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      if (!name) missingFields.push('name');
      console.log('Missing required fields:', missingFields);
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return NextResponse.json({ message: "Invalid email format" }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      console.log('Password too short');
      return NextResponse.json({ message: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // Validate name length
    if (name.length < 2) {
      console.log('Name too short');
      return NextResponse.json({ message: "Name must be at least 2 characters long" }, { status: 400 });
    }

    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      console.log('User already exists:', email);
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    try {
      // Test database connection
      console.log('Testing database connection...');
      await prisma.$connect();
      console.log('Database connection successful');

      console.log('Creating user with data:', {
        email,
        name,
        hasPassword: true,
        settingsData: {
          nightscoutUrl: "",
          lowGlucose: 70.0,
          highGlucose: 180.0,
        }
      });

      // Create user with default settings
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          settings: {
            create: {
              nightscoutUrl: "",
              lowGlucose: 70.0,
              highGlucose: 180.0,
            },
          },
        },
        include: {
          settings: true,
        },
      });

      console.log('User created successfully:', { id: user.id, email: user.email });

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