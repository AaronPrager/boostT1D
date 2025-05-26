import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// GET /api/basal - Get all basal profiles for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profiles = await prisma.basalProfile.findMany({
      where: { userId: user.id },
      include: {
        rates: {
          orderBy: { startTime: 'asc' }
        }
      }
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Error fetching basal profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/basal - Create a new basal profile
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { name, rates } = await request.json();

    // Validate input
    if (!name || !rates || !Array.isArray(rates) || rates.length === 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Validate rates format
    for (const rate of rates) {
      if (!rate.startTime || !rate.rate || typeof rate.rate !== 'number') {
        return NextResponse.json({ error: 'Invalid rate format' }, { status: 400 });
      }
      // Validate time format (HH:mm)
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(rate.startTime)) {
        return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
      }
    }

    // Create the profile with rates
    const profile = await prisma.basalProfile.create({
      data: {
        name,
        userId: user.id,
        rates: {
          create: rates
        }
      },
      include: {
        rates: true
      }
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error creating basal profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/basal - Update a basal profile
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, rates } = await request.json();

    // Validate input
    if (!id || !name || !rates || !Array.isArray(rates)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Verify ownership
    const profile = await prisma.basalProfile.findFirst({
      where: {
        id,
        user: {
          email: session.user.email
        }
      }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found or unauthorized' }, { status: 404 });
    }

    // Update profile
    const updatedProfile = await prisma.$transaction(async (tx: PrismaClient) => {
      // Delete existing rates
      await tx.basalRate.deleteMany({
        where: { profileId: id }
      });

      // Update profile and create new rates
      return tx.basalProfile.update({
        where: { id },
        data: {
          name,
          rates: {
            create: rates
          }
        },
        include: {
          rates: {
            orderBy: { startTime: 'asc' }
          }
        }
      });
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating basal profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/basal?id={profileId} - Delete a basal profile
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Verify ownership
    const profile = await prisma.basalProfile.findFirst({
      where: {
        id,
        user: {
          email: session.user.email
        }
      }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found or unauthorized' }, { status: 404 });
    }

    // Delete profile (this will cascade delete rates due to the relation setup)
    await prisma.basalProfile.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting basal profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 