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
    const { id: treatmentId } = await params;

    if (!treatmentId) {
      return NextResponse.json({ error: 'Treatment ID is required' }, { status: 400 });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the treatment exists and belongs to the user
    const treatment = await prisma.treatment.findUnique({
      where: { id: treatmentId },
    });

    if (!treatment) {
      return NextResponse.json({ error: 'Treatment not found' }, { status: 404 });
    }

    if (treatment.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the treatment
    await prisma.treatment.delete({
      where: { id: treatmentId },
    });

    console.log(`Deleted treatment ${treatmentId} for user ${user.email}`);
    return NextResponse.json({ message: 'Treatment deleted successfully' });
  } catch (error) {
    console.error('Failed to delete treatment:', error);
    return NextResponse.json(
      { error: 'Failed to delete treatment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

