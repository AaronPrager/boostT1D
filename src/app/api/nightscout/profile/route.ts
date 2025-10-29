import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

function sha1(token: string): string {
  return crypto.createHash('sha1').update(token).digest('hex');
}

// Define a type for profile entries
interface ProfileEntry {
  time: string;
  value: string;
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

    // Add API token if available
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    // Type guard for possible custom fields on settings
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
      const errorText = await response.text();

      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Unauthorized. Please check your Nightscout API token. Note: The token should be your raw API secret, not the SHA-1 hash.',
          details: errorText
        }, { status: 401 });
      }
      throw new Error(`Failed to fetch Nightscout profile: ${response.status} ${response.statusText}`);
    }

    const profiles = await response.json();

    // Ensure we have profile data
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({ error: 'No profiles found in Nightscout' }, { status: 404 });
    }

    // Get the most recent profile (first one)
    const defaultProfile = profiles[0];

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
      return NextResponse.json({ 
        error: 'No profile data found. Please check your Nightscout profile setup.',
        details: 'Profile structure does not contain required settings'
      }, { status: 404 });
    }

    // Format all settings for our application to match the frontend Profile type
    const formattedProfile = {
      name: profileName,
      dia: profileData.dia ? parseFloat(profileData.dia) : 0,
      timezone: profileData.timezone || 'UTC',
      units: profileData.units || 'mg/dl',
      
      // Basal rates - convert to expected format
      basal: profileData.basal?.map((entry: ProfileEntry) => ({
        time: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: {time: string}, b: {time: string}) => a.time.localeCompare(b.time)) || [],
      
      // Carb ratios - convert to expected format
      carbratio: profileData.carbratio?.map((entry: ProfileEntry) => ({
        time: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: {time: string}, b: {time: string}) => a.time.localeCompare(b.time)) || [],
      
      // Insulin sensitivity factors - convert to expected format
      sens: profileData.sens?.map((entry: ProfileEntry) => ({
        time: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: {time: string}, b: {time: string}) => a.time.localeCompare(b.time)) || [],
      
      // Target low values
      target_low: profileData.target_low?.map((entry: ProfileEntry) => ({
        time: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: {time: string}, b: {time: string}) => a.time.localeCompare(b.time)) || [],
      
      // Target high values
      target_high: profileData.target_high?.map((entry: ProfileEntry) => ({
        time: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: {time: string}, b: {time: string}) => a.time.localeCompare(b.time)) || []
    };

    return NextResponse.json(formattedProfile);
  } catch (error) {
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
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to fetch profile',
      { status: 500 }
    );
  }
} 