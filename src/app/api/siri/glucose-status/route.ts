import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function sha1(token: string): string {
  return crypto.createHash('sha1').update(token).digest('hex');
}

// Helper function to determine glucose trend direction
function getTrendDirection(trend: number): string {
  if (trend > 3) return 'rising rapidly';
  if (trend > 1) return 'rising';
  if (trend > -1) return 'stable';
  if (trend > -3) return 'falling';
  return 'falling rapidly';
}

// Helper function to determine glucose status
function getGlucoseStatus(glucose: number): string {
  if (glucose < 70) return 'low';
  if (glucose < 80) return 'on the lower side';
  if (glucose > 180) return 'high';
  if (glucose > 140) return 'elevated';
  return 'in range';
}

// Helper function to get time since last reading
function getTimeSince(timestamp: number): string {
  const now = Date.now();
  const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));
  
  if (diffMinutes < 2) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;
  
  if (diffHours === 1) {
    return remainingMinutes > 0 ? `1 hour and ${remainingMinutes} minutes ago` : '1 hour ago';
  }
  
  return remainingMinutes > 0 
    ? `${diffHours} hours and ${remainingMinutes} minutes ago`
    : `${diffHours} hours ago`;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        spoken_response: "Please log in to check your blood sugar.",
        error: "Authentication required"
      }, { status: 401 });
    }

    // Get user settings
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true }
    });

    if (!user?.settings?.nightscoutUrl) {
      return NextResponse.json({
        success: false,
        spoken_response: "Your Nightscout URL is not configured. Please set it up in your app settings.",
        error: "Nightscout URL not configured"
      }, { status: 400 });
    }

    // Clean and validate the Nightscout URL
    let baseUrl = user.settings.nightscoutUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Fetch latest glucose entry from Nightscout
    const nsUrl = new URL('/api/v1/entries/sgv', baseUrl);
    nsUrl.searchParams.set('count', '2'); // Get 2 entries to calculate trend
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    const nsApiToken = (user.settings as Record<string, unknown>).nightscoutApiToken as string | undefined;
    if (nsApiToken) {
      const hashedToken = sha1(nsApiToken);
      headers['api-secret'] = hashedToken;
    }

    const response = await fetch(nsUrl.toString(), { 
      method: 'GET',
      headers 
    });
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        spoken_response: "I couldn't connect to your Nightscout data right now. Please try again later.",
        error: "Failed to fetch from Nightscout"
      }, { status: 500 });
    }

    const entries = await response.json();
    
    if (!entries || entries.length === 0) {
      return NextResponse.json({
        success: false,
        spoken_response: "No glucose readings found. Make sure your CGM is connected.",
        error: "No glucose data available"
      }, { status: 404 });
    }

    const latestEntry = entries[0];
    const glucose = latestEntry.sgv;
    const timestamp = latestEntry.mills || latestEntry.date;
    const timeSince = getTimeSince(timestamp);
    
    // Calculate trend if we have multiple entries
    let trendText = '';
    if (entries.length > 1) {
      const previousEntry = entries[1];
      const trendValue = glucose - previousEntry.sgv;
      const trendDirection = getTrendDirection(trendValue);
      trendText = `, and ${trendDirection}`;
    }

    // Determine glucose status
    const status = getGlucoseStatus(glucose);
    
    // Create voice-friendly response
    let spokenResponse = `Your blood sugar is ${glucose}, which is ${status}${trendText}. This reading was taken ${timeSince}.`;
    
    // Add contextual advice for concerning readings
    if (glucose < 70) {
      spokenResponse += " Consider having 15 grams of fast-acting carbs and recheck in 15 minutes.";
    } else if (glucose > 250) {
      spokenResponse += " This is quite high. Check for ketones and consider contacting your healthcare provider.";
    }

    return NextResponse.json({
      success: true,
      spoken_response: spokenResponse,
      data: {
        glucose: glucose,
        status: status,
        timestamp: timestamp,
        time_since: timeSince,
        trend_direction: entries.length > 1 ? getTrendDirection(glucose - entries[1].sgv) : null,
        unit: 'mg/dL'
      }
    });

  } catch (error) {
    console.error('Siri glucose status error:', error);
    return NextResponse.json({
      success: false,
      spoken_response: "I'm having trouble getting your blood sugar right now. Please try again later.",
      error: "Internal server error"
    }, { status: 500 });
  }
}

// Support both authenticated and API key access for Siri Shortcuts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key } = body;
    
    // If API key is provided, validate it (you can add a user API key system)
    // For now, fall back to session-based auth
    return GET(request);
  } catch (error) {
    return GET(request);
  }
} 