import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id: readingId } = await params;

    if (!readingId) {
      return NextResponse.json({ error: 'Reading ID is required' }, { status: 400 });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the reading exists and belongs to the user
    const reading = await prisma.glucoseReading.findUnique({
      where: { id: readingId },
    });

    if (!reading) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    if (reading.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only allow deletion of manual readings
    if (reading.source !== 'manual') {
      return NextResponse.json(
        { error: 'Only manual readings can be deleted' },
        { status: 403 }
      );
    }

    // Delete the reading
    await prisma.glucoseReading.delete({
      where: { id: readingId },
    });

    console.log(`Deleted manual reading ${readingId} for user ${user.email}`);
    return NextResponse.json({ message: 'Reading deleted successfully' });
  } catch (error) {
    console.error('Failed to delete reading:', error);
    return NextResponse.json(
      { error: 'Failed to delete reading', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

