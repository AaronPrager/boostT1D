import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { calculateIOB, calculateCOB, calculateSafeBolus, calculateSafeBolusWithNightscoutIOB, fetchRecentTreatments, fetchNightscoutIOB, fetchNightscoutCOB, Treatment } from '@/lib/insulinCalculations';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

function sha1(token: string): string {
  return crypto.createHash('sha1').update(token).digest('hex');
}

// Helper function to get current carb ratio based on time
function getCurrentCarbRatio(carbRatios: Array<{time: string, value: number}>) {
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Sort by time and find the applicable ratio
  const sortedRatios = carbRatios.sort((a, b) => {
    const aMinutes = timeToMinutes(a.time);
    const bMinutes = timeToMinutes(b.time);
    return aMinutes - bMinutes;
  });
  
  let applicableRatio = sortedRatios[0]; // Default to first ratio
  
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

// Helper function to get current insulin sensitivity
function getCurrentInsulinSensitivity(sensList: Array<{time: string, value: number}>) {
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  
  const sortedSens = sensList.sort((a, b) => {
    const aMinutes = timeToMinutes(a.time);
    const bMinutes = timeToMinutes(b.time);
    return aMinutes - bMinutes;
  });
  
  let applicableSens = sortedSens[0]; // Default to first sensitivity
  
  for (const sens of sortedSens) {
    const sensMinutes = timeToMinutes(sens.time);
    if (currentTimeMinutes >= sensMinutes) {
      applicableSens = sens;
    } else {
      break;
    }
  }
  
  return applicableSens;
}

// Helper function to convert time string to minutes
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to fetch user's Nightscout profile directly
async function getUserProfile(userEmail: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { settings: true }
    });

    if (!user?.settings?.nightscoutUrl) {
      return null;
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
      return null;
    }

    const profiles = await response.json();
    
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return null;
    }

    // Get the most recent profile
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

    if (!profileData?.basal) {
      return null;
    }
    
    // Format profile data
    return {
      carbratio: profileData.carbratio?.map((entry: any) => ({
        time: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: {time: string}, b: {time: string}) => a.time.localeCompare(b.time)) || [],
      
      sens: profileData.sens?.map((entry: any) => ({
        time: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: {time: string}, b: {time: string}) => a.time.localeCompare(b.time)) || [],
      
      target_high: profileData.target_high?.map((entry: any) => ({
        time: entry.time || '00:00',
        value: parseFloat(entry.value)
      })).sort((a: {time: string}, b: {time: string}) => a.time.localeCompare(b.time)) || []
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// Helper function to get current glucose from Nightscout directly
async function getCurrentGlucose(userEmail: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { settings: true }
    });

    if (!user?.settings?.nightscoutUrl) {
      return null;
    }

    // Clean and validate the Nightscout URL
    let baseUrl = user.settings.nightscoutUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Fetch latest glucose entry
    const nsUrl = new URL('/api/v1/entries/sgv', baseUrl);
    nsUrl.searchParams.set('count', '1');
    
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
      return null;
    }

    const entries = await response.json();
    return entries && entries.length > 0 ? entries[0].sgv : null;
  } catch (error) {
    console.error('Error fetching glucose:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session (but don't require it for basic carb estimation)
    const session = await getServerSession(authOptions);

    // Check if API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({
        error: "Food analysis service is currently unavailable. Please try again later."
      }, { status: 503 });
    }

    const formData = await request.formData();
    const imageFile = (formData.get('photo') || formData.get('image')) as File;

    if (!imageFile) {
      return NextResponse.json({
        error: "No image file provided"
      }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this food image and estimate the carbohydrate content. Please provide:
1. A brief description of the food items you see
2. An estimated total carbohydrates in grams
3. Your confidence level (High/Medium/Low)
4. Any important notes about the estimation

Please be as accurate as possible and consider typical serving sizes. Respond in this exact JSON format:
{
  "description": "description of food items",
  "carbs_grams": number,
  "confidence": "High/Medium/Low",
  "notes": "relevant notes about the estimation"
}`;

    // Ensure we have a valid MIME type
    let mimeType = imageFile.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      // Default to JPEG if no valid MIME type
      mimeType = 'image/jpeg';
    }
    
    console.log('📸 Image details:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
      finalMimeType: mimeType
    });

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Try to parse the JSON response
    let analysis;
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Google AI response:', text);
      // Return a fallback response
      return NextResponse.json({
        success: true,
        analysis: {
          description: "Food items detected but couldn't parse detailed analysis",
          carbs_grams: 30,
          confidence: "Low",
          notes: "Unable to provide detailed analysis. Please try another photo with better lighting.",
          insulin_recommendation: null
        }
      });
    }

    // Validate the response structure
    if (!analysis.description || typeof analysis.carbs_grams !== 'number' || !analysis.confidence) {
      throw new Error('Invalid response structure from Google AI');
    }

    // Fetch user profile and data for insulin calculations (only for authenticated users)
    let profile = null;
    let currentGlucose = null;
    let nightscoutIOB = 0;
    let nightscoutCOB = 0;
    let recentTreatments: Treatment[] = [];
    let nightscoutError: string | null = null;
    
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { settings: true }
      });
      
      if (user?.settings?.nightscoutUrl && user?.settings?.nightscoutApiToken) {
        profile = await getUserProfile(session.user.email);
        currentGlucose = await getCurrentGlucose(session.user.email);
        
        // Try to get IOB from Nightscout first
        console.log('🔄 Starting IOB fetch process...');
        console.log('📡 Nightscout URL:', user.settings.nightscoutUrl);
        console.log('🔑 API Token length:', user.settings.nightscoutApiToken?.length || 0);
        console.log('🔑 API Token (first 10 chars):', user.settings.nightscoutApiToken?.substring(0, 10) + '...');
        console.log('🔑 API Secret length:', (user.settings as any)?.nightscoutApiSecret?.length || 0);
        console.log('🔑 API Secret (first 10 chars):', (user.settings as any)?.nightscoutApiSecret?.substring(0, 10) + '...');
        console.log('🔑 Full settings object keys:', Object.keys(user.settings));
        
        try {
          console.log('🔑 Using raw API token for IOB fetch');
          
          // Test if token might be empty or whitespace
          const token = user.settings.nightscoutApiToken?.trim();
          if (!token) {
            throw new Error('API token is empty or contains only whitespace');
          }
          
          const iobResult = await fetchNightscoutIOB(
            user.settings.nightscoutUrl,
            token
          );
          
          nightscoutIOB = iobResult.iob;
          console.log('✅ Nightscout IOB fetch successful:', {
            iob: nightscoutIOB,
            source: iobResult.source
          });

          // Also fetch COB from Nightscout
          try {
            const cobResult = await fetchNightscoutCOB(
              user.settings.nightscoutUrl,
              token
            );
            
            nightscoutCOB = cobResult.cob;
            console.log('✅ Nightscout COB fetch successful:', {
              cob: nightscoutCOB,
              source: cobResult.source
            });
          } catch (cobError) {
            console.log('⚠️ Failed to fetch Nightscout COB, will use manual calculation:', cobError);
          }
        } catch (error) {
          console.error('❌ Failed to fetch Nightscout IOB, falling back to manual calculation:', error);
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            name: error instanceof Error ? error.name : 'Unknown error type'
          });
          nightscoutError = error instanceof Error ? error.message : 'Unknown error';
          
          // Fallback: fetch recent treatments for manual IOB and COB calculation
          try {
            console.log('🔄 Attempting fallback to manual IOB and COB calculation...');
            recentTreatments = await fetchRecentTreatments(
              user.settings.nightscoutUrl,
              user.settings.nightscoutApiToken,
              6 // Look back 6 hours
            );
            console.log('📊 Fetched recent treatments for manual IOB/COB:', recentTreatments.length, 'treatments');
          } catch (fallbackError) {
            console.error('❌ Failed to fetch recent treatments for IOB/COB:', fallbackError);
          }
        }
      }
    }
    
    let insulinRecommendation = null;
    
    if (session?.user?.email && profile && profile.carbratio && profile.carbratio.length > 0) {
      const currentCarbRatio = getCurrentCarbRatio(profile.carbratio);
      
      // Get insulin sensitivity and target glucose for correction calculation
      let currentSensitivity = null;
      let targetGlucose = null;
      
      if (profile.sens && profile.sens.length > 0 && profile.target_high && profile.target_high.length > 0) {
        currentSensitivity = getCurrentInsulinSensitivity(profile.sens);
        targetGlucose = profile.target_high[0].value;
      }
      
      // Use Nightscout IOB if available, otherwise fall back to manual calculation
      let currentIOB = nightscoutIOB;
      let iobResult = null;
      let safetyWarnings: string[] = [];
      
      console.log('🧮 IOB decision logic:');
      console.log('  - Nightscout IOB:', nightscoutIOB);
      console.log('  - Recent treatments count:', recentTreatments.length);
      
      if (nightscoutIOB > 0) {
        // Use Nightscout IOB
        console.log('✅ Using Nightscout IOB:', nightscoutIOB);
      } else if (recentTreatments.length > 0) {
        // Fallback to manual IOB calculation
        console.log('🔄 Falling back to manual IOB calculation...');
        iobResult = calculateIOB(recentTreatments);
        currentIOB = iobResult.totalIOB;
        safetyWarnings = iobResult.safetyWarnings;
        console.log('✅ Using calculated IOB:', currentIOB);
      } else {
        console.log('⚠️ No IOB data available - using 0');
        
        // Add helpful guidance if Nightscout failed
        if (nightscoutError) {
          safetyWarnings.push(`⚠️ Nightscout IOB unavailable: ${nightscoutError}`);
          safetyWarnings.push('💡 Please check your Nightscout settings in Diabetes Profile');
        }
      }
      
      console.log('🎯 Final IOB for calculations:', currentIOB);
      
      // Calculate COB (Carbs on Board)
      let currentCOB = nightscoutCOB;
      let cobResult = null;
      
      console.log('🧮 COB decision logic:');
      console.log('  - Nightscout COB:', nightscoutCOB);
      console.log('  - Recent treatments count:', recentTreatments.length);
      
      if (nightscoutCOB > 0) {
        // Use Nightscout COB
        console.log('✅ Using Nightscout COB:', nightscoutCOB);
      } else if (recentTreatments.length > 0) {
        // Fallback to manual COB calculation
        console.log('🔄 Falling back to manual COB calculation...');
        cobResult = calculateCOB(recentTreatments);
        currentCOB = cobResult.totalCOB;
        console.log('✅ Using calculated COB:', currentCOB);
      } else {
        console.log('⚠️ No COB data available - using 0');
      }
      
      console.log('🎯 Final COB for calculations:', currentCOB);
      
      // Use the appropriate safe bolus calculation
      if (currentGlucose && currentSensitivity && targetGlucose) {
        let safeBolusResult;
        
        if (nightscoutIOB > 0) {
          // Use Nightscout IOB calculation
          safeBolusResult = calculateSafeBolusWithNightscoutIOB(
            analysis.carbs_grams,
            currentGlucose,
            targetGlucose,
            currentCarbRatio.value,
            currentSensitivity.value,
            currentIOB,
            currentCOB
          );
        } else {
          // Use fallback calculation
          safeBolusResult = calculateSafeBolus(
            analysis.carbs_grams,
            currentGlucose,
            targetGlucose,
            currentCarbRatio.value,
            currentSensitivity.value,
            currentIOB,
            currentCOB
          );
        }
        
        insulinRecommendation = {
          carb_bolus_units: safeBolusResult.carbBolusUnits,
          correction_units: safeBolusResult.correctionUnits,
          total_units: safeBolusResult.totalInsulinNeeded,
          safe_bolus: safeBolusResult.safeBolus,
          current_iob: safeBolusResult.currentIOB,
          current_cob: currentCOB,
          iob_reduction: safeBolusResult.iobReduction,
          carb_ratio: safeBolusResult.settings.carbRatio,
          carb_ratio_time: safeBolusResult.settings.carbRatioTime,
          current_glucose: currentGlucose,
          insulin_sensitivity: currentSensitivity.value,
          target_glucose: targetGlucose,
          calculation_note: safeBolusResult.calculationNote,
          warning: safeBolusResult.safeBolus > 10 ? "Large bolus calculated - please double-check carb estimate and IOB" : null,
          safety_warnings: [...safeBolusResult.safetyWarnings, ...safetyWarnings],
          iob_breakdown: iobResult?.breakdown || [],
          cob_breakdown: cobResult?.breakdown || []
        };
      } else {
        // Fallback calculation without correction (carb bolus only)
        const carbBolusUnits = analysis.carbs_grams / currentCarbRatio.value;
        const totalUnits = carbBolusUnits;
        const safeBolus = Math.max(0, totalUnits - currentIOB);
        
        insulinRecommendation = {
          carb_bolus_units: Math.round(carbBolusUnits * 10) / 10,
          correction_units: 0,
          total_units: Math.round(totalUnits * 10) / 10,
          safe_bolus: Math.round(safeBolus * 10) / 10,
          current_iob: currentIOB,
          current_cob: currentCOB,
          iob_reduction: Math.min(currentIOB, totalUnits),
          carb_ratio: currentCarbRatio.value,
          carb_ratio_time: currentCarbRatio.time,
          current_glucose: currentGlucose,
          insulin_sensitivity: currentSensitivity?.value,
          target_glucose: targetGlucose,
          calculation_note: `🍎 CARB CALCULATION:\n   ${analysis.carbs_grams}g ÷ ${currentCarbRatio.value} = ${carbBolusUnits.toFixed(1)}u\n\n💉 INSULIN ON BOARD (IOB):\n   Total IOB: ${currentIOB.toFixed(1)}u\n\n✅ SAFE BOLUS CALCULATION:\n   ${carbBolusUnits.toFixed(1)}u needed - ${currentIOB.toFixed(1)}u IOB = ${safeBolus.toFixed(1)}u`,
          warning: safeBolus > 10 ? "Large bolus calculated - please double-check carb estimate" : null,
          safety_warnings: safetyWarnings,
          iob_breakdown: iobResult?.breakdown || []
        };
      }
    }

    // Add insulin recommendation to analysis (only for authenticated users)
    if (session?.user?.email) {
      analysis.insulin_recommendation = insulinRecommendation;
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Food analysis error:', error);
    
    // Check if it's a Google AI API error
    if (error instanceof Error && error.message && error.message.includes('API key')) {
      return NextResponse.json({
        error: "Food analysis service is currently unavailable. Please try again later."
      }, { status: 503 });
    }

    return NextResponse.json({
      error: "Failed to analyze the food image. Please try again with a clearer photo."
    }, { status: 500 });
  }
}