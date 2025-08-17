import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchNightscoutIOB } from '@/lib/insulinCalculations';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧪 Test IOB endpoint called for user:', session.user.email);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true }
    });

    if (!user?.settings) {
      return NextResponse.json({ error: 'No settings found' }, { status: 404 });
    }

    console.log('📊 User settings:', {
      hasUrl: !!user.settings.nightscoutUrl,
      hasToken: !!user.settings.nightscoutApiToken,
      url: user.settings.nightscoutUrl,
      tokenLength: user.settings.nightscoutApiToken?.length || 0,
      tokenPreview: user.settings.nightscoutApiToken?.substring(0, 10) + '...'
    });

    if (!user.settings.nightscoutUrl || !user.settings.nightscoutApiToken) {
      return NextResponse.json({ 
        error: 'Nightscout not configured',
        settings: {
          hasUrl: !!user.settings.nightscoutUrl,
          hasToken: !!user.settings.nightscoutApiToken
        }
      }, { status: 400 });
    }

    try {
      const iobResult = await fetchNightscoutIOB(
        user.settings.nightscoutUrl,
        user.settings.nightscoutApiToken
      );

      return NextResponse.json({
        success: true,
        iob: iobResult.iob,
        source: iobResult.source,
        status: iobResult.status
      });
    } catch (error) {
      console.error('❌ IOB fetch error:', error);
      return NextResponse.json({
        error: 'Failed to fetch IOB',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Test IOB endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 