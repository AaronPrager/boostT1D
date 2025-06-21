import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function sha1(token: string): string {
  return crypto.createHash('sha1').update(token).digest('hex');
}

// Helper function to get current carb ratio based on time
function getCurrentCarbRatio(carbRatios: Array<{time: string, value: number}>) {
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  
  const sortedRatios = carbRatios.sort((a, b) => {
    const aMinutes = timeToMinutes(a.time);
    const bMinutes = timeToMinutes(b.time);
    return aMinutes - bMinutes;
  });
  
  let applicableRatio = sortedRatios[0];
  
  for (const ratio of sortedRatios) {
    const ratioMinutes = timeToMinutes(ratio.time);
    if (currentTimeMinutes >= ratioMinutes) {
      applicableRatio = ratio;
    } else {
      break;
    }
  }
  
  return applicableRatio;
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carbs = searchParams.get('carbs');
    
    if (!carbs || isNaN(Number(carbs))) {
      return NextResponse.json({
        success: false,
        spoken_response: "Please specify the number of carbs. For example, say 'calculate insulin for 45 grams'.",
        error: "Carbs parameter required"
      }, { status: 400 });
    }

    const carbsNum = Number(carbs);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        spoken_response: "Please log in to calculate insulin.",
        error: "Authentication required"
      }, { status: 401 });
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true }
    });

    if (!user?.settings?.nightscoutUrl) {
      return NextResponse.json({
        success: false,
        spoken_response: "Your Nightscout profile is not configured. Please set it up in your app settings.",
        error: "Nightscout URL not configured"
      }, { status: 400 });
    }

    // Fetch profile from Nightscout
    let baseUrl = user.settings.nightscoutUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const nsUrl = new URL('/api/v1/profile.json', baseUrl);
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
        spoken_response: "I couldn't access your pump settings right now. Please try again later.",
        error: "Failed to fetch profile"
      }, { status: 500 });
    }

    const profiles = await response.json();
    
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({
        success: false,
        spoken_response: "No pump profile found. Please make sure your Nightscout profile is configured.",
        error: "No profile data"
      }, { status: 404 });
    }

    // Get profile data
    const defaultProfile = profiles[0];
    let profileData;

    if (defaultProfile.store?.Default?.basal) {
      profileData = defaultProfile.store.Default;
    } else if (defaultProfile.store?.default?.basal) {
      profileData = defaultProfile.store.default;
    } else if (defaultProfile.defaultProfile?.basal) {
      profileData = defaultProfile.defaultProfile;
    } else if (defaultProfile.basal) {
      profileData = defaultProfile;
    }

    if (!profileData?.carbratio) {
      return NextResponse.json({
        success: false,
        spoken_response: "Your carb ratios are not configured in your pump profile. Please set them up.",
        error: "No carb ratios found"
      }, { status: 404 });
    }

    // Format carb ratios
    const carbRatios = profileData.carbratio.map((entry: any) => ({
      time: entry.time || '00:00',
      value: parseFloat(entry.value)
    }));

    // Get current carb ratio
    const currentRatio = getCurrentCarbRatio(carbRatios);
    const insulinUnits = Math.round((carbsNum / currentRatio.value) * 10) / 10;

    // Create voice response
    let spokenResponse = `For ${carbsNum} grams of carbs, you need ${insulinUnits} units of insulin. `;
    spokenResponse += `This is based on your current carb ratio of 1 to ${currentRatio.value}, which is active at ${currentRatio.time}.`;

    // Add safety warning for large boluses
    if (insulinUnits > 10) {
      spokenResponse += " This is a large bolus. Please double-check your carb count.";
    }

    return NextResponse.json({
      success: true,
      spoken_response: spokenResponse,
      data: {
        carbs: carbsNum,
        insulin_units: insulinUnits,
        carb_ratio: currentRatio.value,
        carb_ratio_time: currentRatio.time,
        calculation: `${carbsNum}g ÷ ${currentRatio.value} = ${insulinUnits}u`
      }
    });

  } catch (error) {
    console.error('Siri insulin calc error:', error);
    return NextResponse.json({
      success: false,
      spoken_response: "I'm having trouble calculating insulin right now. Please try again later.",
      error: "Internal server error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { carbs } = body;
    
    if (!carbs || isNaN(Number(carbs))) {
      return NextResponse.json({
        success: false,
        spoken_response: "Please specify the number of carbs.",
        error: "Carbs required"
      }, { status: 400 });
    }

    // Create a new URL with carbs as query parameter and call GET
    const url = new URL(request.url);
    url.searchParams.set('carbs', carbs.toString());
    
    const newRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers
    });
    
    return GET(newRequest);
  } catch (error) {
    return NextResponse.json({
      success: false,
      spoken_response: "I'm having trouble calculating insulin right now. Please try again later.",
      error: "Internal server error"
    }, { status: 500 });
  }
} 