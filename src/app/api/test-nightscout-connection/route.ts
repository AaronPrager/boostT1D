import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧪 Test Nightscout connection endpoint called for user:', session.user.email);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true }
    });

    if (!user?.settings?.nightscoutUrl) {
      return NextResponse.json({ error: 'No Nightscout URL configured' }, { status: 400 });
    }

    const baseUrl = user.settings.nightscoutUrl.trim();
    console.log('📡 Testing connection to:', baseUrl);

    // Test 1: Try to connect without authentication
    try {
      const response = await fetch(`${baseUrl}/api/v1/status.json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('📥 Response without auth:', response.status, response.statusText);
      
      if (response.status === 401) {
        console.log('✅ URL is correct, authentication required');
      } else if (response.status === 200) {
        console.log('⚠️ URL works without authentication (insecure)');
      } else {
        console.log('❌ URL might be incorrect or server error');
      }
      
      return NextResponse.json({
        url: baseUrl,
        status: response.status,
        statusText: response.statusText,
        requiresAuth: response.status === 401,
        worksWithoutAuth: response.status === 200
      });
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return NextResponse.json({
        error: 'Failed to connect to Nightscout',
        details: error instanceof Error ? error.message : 'Unknown error',
        url: baseUrl
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Test connection endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 