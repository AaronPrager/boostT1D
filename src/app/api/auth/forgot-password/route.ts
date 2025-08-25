import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration attacks
    // Even if user doesn't exist, we don't want to reveal that information
    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent a password reset link.' },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database
    await prisma.verificationToken.create({
      data: {
        email: email,
        token: resetToken,
        expiresAt: resetTokenExpiry,
        type: 'PASSWORD_RESET'
      }
    });

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // TODO: Send email with reset link
    // For now, we'll just log it (you can integrate with your email service later)
    console.log('Password reset requested for:', email);
    console.log('Reset URL:', resetUrl);

    // In production, you would send an email here using a service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Nodemailer with your SMTP server

    return NextResponse.json(
      { message: 'If an account with that email exists, we have sent a password reset link.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
