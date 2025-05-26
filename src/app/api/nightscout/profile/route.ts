import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import crypto from 'crypto';

function sha1(token: string): string {
  return crypto.createHash('sha1').update(token).digest('hex');
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        settings: true
      }
    });

    if (!user?.settings?.nightscoutUrl) {
      return NextResponse.json({ error: 'Nightscout URL not configured' }, { status: 400 });
    }

    // Clean and validate the Nightscout URL
    let baseUrl = user.settings.nightscoutUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Fetch profile from Nightscout
    const nsUrl = new URL('/api/v1/profile.json', baseUrl);
    console.log('Fetching Nightscout profile from:', nsUrl.toString());
    
    // Add API token if available
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (user.settings.nightscoutApiToken) {
      console.log('Using API token for authentication');
      const hashedToken = sha1(user.settings.nightscoutApiToken);
      console.log('Using hashed token:', hashedToken);
      headers['api-secret'] = hashedToken;
    }

    const response = await fetch(nsUrl.toString(), { 
      method: 'GET',
      headers 
    });
    
    console.log('Nightscout response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nightscout error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Unauthorized. Please check your Nightscout API token. Note: The token should be your raw API secret, not the SHA-1 hash.',
          details: errorText
        }, { status: 401 });
      }
      throw new Error(`Failed to fetch Nightscout profile: ${response.status} ${response.statusText}`);
    }

    const profiles = await response.json();
    console.log('Raw Nightscout response:', JSON.stringify(profiles, null, 2));
    
    // Ensure we have profile data
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({ error: 'No profiles found in Nightscout' }, { status: 404 });
    }

    // Get the most recent profile (first one)
    const defaultProfile = profiles[0];
    console.log('Selected profile:', JSON.stringify(defaultProfile, null, 2));
    
    // Try different known Nightscout profile structures
    let profileData;
    let profileName;

    if (defaultProfile.store?.Default?.basal) {
      profileData = defaultProfile.store.Default;
      profileName = profileData.name || 'Nightscout Profile';
    } else if (defaultProfile.store?.default?.basal) {
      profileData = defaultProfile.store.default;
      profileName = profileData.name || 'Nightscout Profile';
    } else if (defaultProfile.defaultProfile?.basal) {
      profileData = defaultProfile.defaultProfile;
      profileName = profileData.name || 'Nightscout Profile';
    } else if (defaultProfile.basal) {
      profileData = defaultProfile;
      profileName = defaultProfile.name || 'Nightscout Profile';
    }

    if (!profileData?.basal) {
      console.error('Could not find profile data:', defaultProfile);
      return NextResponse.json({ 
        error: 'No profile data found. Please check your Nightscout profile setup.',
        details: 'Profile structure does not contain required settings'
      }, { status: 404 });
    }

    console.log('Found profile data:', JSON.stringify(profileData, null, 2));
    
    // Format all settings for our application
    const formattedProfile = {
      name: profileName,
      // Basal rates
      basal: profileData.basal.map((entry: any) => ({
        startTime: entry.time || '00:00',
        rate: parseFloat(entry.value)
      })).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)),
      
      // Carb ratios
      carbRatios: profileData.carbratio?.map((entry: any) => ({
        startTime: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)) || [],
      
      // Insulin sensitivity factors
      sensitivities: profileData.sens?.map((entry: any) => ({
        startTime: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)) || [],
      
      // Target ranges
      targetRanges: profileData.target_low?.map((entry: any, index: number) => ({
        startTime: entry.time || '00:00',
        low: parseFloat(entry.value),
        high: parseFloat(profileData.target_high[index]?.value || entry.value)
      })).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)) || [],
      
      // Other settings
      dia: profileData.dia ? parseFloat(profileData.dia) : null,
      timezone: profileData.timezone || null,
      units: profileData.units || null,
      carbsHr: profileData.carbs_hr ? parseInt(profileData.carbs_hr) : null,
      delay: profileData.delay ? parseInt(profileData.delay) : null
    };

    console.log('Formatted profile with all settings:', JSON.stringify(formattedProfile, null, 2));
    return NextResponse.json(formattedProfile);
  } catch (error) {
    console.error('Error fetching Nightscout profile:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to fetch Nightscout profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return new NextResponse('Nightscout URL is required', { status: 400 });
    }

    // Clean up the URL
    const baseUrl = url.trim().replace(/\/$/, '');
    const profileUrl = `${baseUrl}/api/v1/profile.json`;

    const response = await fetch(profileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch Nightscout profile');
    }

    const data = await response.json();
    if (!data || !data[0] || !data[0].defaultProfile || !data[0].store || !data[0].store[data[0].defaultProfile]) {
      throw new Error('Invalid profile data structure');
    }

    // Get the default profile data
    const profile = data[0].store[data[0].defaultProfile];

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching Nightscout profile:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to fetch profile',
      { status: 500 }
    );
  }
} 