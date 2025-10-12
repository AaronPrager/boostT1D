import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, token } = body;

    if (!url || !token) {
      return NextResponse.json(
        { success: false, error: 'URL and token are required' },
        { status: 400 }
      );
    }

    // Clean up the URL (remove trailing slash)
    const cleanUrl = url.replace(/\/$/, '');

    // Test connection by fetching status endpoint
    const statusUrl = `${cleanUrl}/api/v1/status`;
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'api-secret': sha1(token),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Try with token as query parameter instead
      const statusUrlWithToken = `${cleanUrl}/api/v1/status?token=${encodeURIComponent(token)}`;
      const responseWithToken = await fetch(statusUrlWithToken, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!responseWithToken.ok) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Failed to connect to Nightscout. Status: ${response.status}. Please check your URL and API token.` 
          },
          { status: 400 }
        );
      }

      // Success with query parameter
      const data = await responseWithToken.json();
      return NextResponse.json({
        success: true,
        message: 'Connection successful!',
        nightscoutVersion: data.version || 'Unknown',
        authMethod: 'token'
      });
    }

    // Success with header authentication
    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Connection successful!',
      nightscoutVersion: data.version || 'Unknown',
      authMethod: 'api-secret'
    });

  } catch (error) {
    console.error('Nightscout connection test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to Nightscout. Please check your URL and network connection.' 
      },
      { status: 500 }
    );
  }
}
