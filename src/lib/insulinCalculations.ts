// Insulin calculation utilities using Nightscout's built-in IOB data

export interface Treatment {
  _id?: string;
  id?: string;
  eventType: string;
  insulin?: number;
  carbs?: number;
  glucose?: number;
  notes?: string;
  created_at: string;
  timestamp?: string;
  duration?: number;
  percent?: number;
  absolute?: number;
}

export interface NightscoutStatus {
  iob?: number;
  activity?: number;
  bolus?: {
    timestamp?: string;
    amount?: number;
    type?: string;
  };
  pump?: {
    battery?: number;
    reservoir?: number;
    status?: string;
  };
  loop?: {
    timestamp?: string;
    version?: string;
    enabled?: boolean;
  };
  openaps?: {
    suggested?: {
      temp?: string;
      bg?: number;
      tick?: string;
      iob?: number;
      reason?: string;
      eventualBG?: number;
      sensitivityRatio?: number;
      predBGs?: number[];
      COB?: number;
      mealCOB?: number;
      microBolus?: number;
      microBolusInsulin?: number;
      microBolusCOB?: number;
      microBolusIOB?: number;
      microBolusReason?: string;
      microBolusTemp?: string;
      microBolusTempTarget?: number;
      microBolusTempTargetHigh?: number;
      microBolusTempTargetLow?: number;
      [key: string]: any; // Allow for additional properties
    };
  };
  cob?: number;
  basal?: {
    timestamp?: string;
    rate?: number;
    temp?: string;
  };
  deviceStatus?: {
    device?: string;
    timestamp?: string;
    pump?: {
      battery?: number;
      reservoir?: number;
      status?: string;
    };
  };
  [key: string]: any; // Allow for additional properties
}

export interface IOBResult {
  totalIOB: number;
  breakdown: Array<{
    treatmentId: string;
    originalDose: number;
    remainingIOB: number;
    timeSinceDose: number; // in hours
    percentageRemaining: number;
  }>;
  safetyWarnings: string[];
}

export interface COBResult {
  totalCOB: number;
  breakdown: Array<{
    treatmentId: string;
    originalCarbs: number;
    remainingCOB: number;
    timeSinceDose: number; // in hours
    percentageRemaining: number;
    needsInsulin: boolean;
  }>;
  safetyWarnings: string[];
}

export interface BolusRecommendation {
  carbBolusUnits: number;
  correctionUnits: number;
  totalInsulinNeeded: number;
  currentIOB: number;
  safeBolus: number;
  iobReduction: number;
  calculationNote: string;
  safetyWarnings: string[];
  settings: {
    carbRatio: number;
    carbRatioTime: string;
    insulinSensitivity?: number;
    targetGlucose?: number;
    currentGlucose?: number;
  };
}

// Different insulin profiles for IOB calculation (fallback when Nightscout IOB unavailable)
export const INSULIN_PROFILES = {
  'rapid': { peak: 1, duration: 4, name: 'Rapid-acting (Humalog, Novolog)' },
  'ultra-rapid': { peak: 0.5, duration: 3, name: 'Ultra-rapid (Fiasp, Lyumjev)' },
  'regular': { peak: 2, duration: 6, name: 'Regular insulin' }
};

// Default insulin profile (rapid-acting)
const DEFAULT_INSULIN_PROFILE = 'rapid';

/**
 * Fetch current IOB from Nightscout status endpoint
 * @param nightscoutUrl Nightscout URL
 * @param apiToken Nightscout API token
 * @returns Current IOB from Nightscout
 */
export async function fetchNightscoutIOB(
  nightscoutUrl: string,
  apiToken: string
): Promise<{ iob: number; status: NightscoutStatus; source: string }> {
  try {
    console.log('🔍 Starting Nightscout IOB fetch...');
    console.log('📡 Original Nightscout URL:', nightscoutUrl);
    console.log('🔑 API Token length:', apiToken?.length || 0);
    console.log('🔑 API Token preview:', apiToken?.substring(0, 10) + '...');
    
    // Clean and validate the Nightscout URL
    let baseUrl = nightscoutUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    console.log('🔧 Cleaned Nightscout URL:', baseUrl);

    // Fetch status from Nightscout
    const statusUrl = `${baseUrl}/api/v1/status.json`;
    console.log('🌐 Fetching from URL:', statusUrl);
    
    // Also try alternative endpoints that some Nightscout instances might use
    const alternativeUrls = [
      `${baseUrl}/api/v1/status.json`,
      `${baseUrl}/api/v1/entries.json?count=1`,
      `${baseUrl}/api/v1/devicestatus.json?count=1`,
      `${baseUrl}/api/v2/status.json`,  // Try v2 API
      `${baseUrl}/status.json`  // Try without version
    ];
    
    console.log('🔍 Will try these URLs:', alternativeUrls);
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (apiToken) {
      const crypto = await import('crypto');
      const hashedToken = crypto.createHash('sha1').update(apiToken).digest('hex');
      headers['api-secret'] = hashedToken;
      console.log('🔑 Using API token (hashed):', hashedToken.substring(0, 10) + '...');
      
      // Log the raw token for debugging (first 10 chars only)
      console.log('🔑 Raw token (first 10 chars):', apiToken.substring(0, 10) + '...');
      
      // Some Nightscout instances might use different header names
      console.log('🔑 Trying with api-secret header');
    } else {
      console.log('⚠️ No API token provided');
    }

    console.log('📤 Making request with headers:', Object.keys(headers));
    
    const response = await fetch(statusUrl, { 
      method: 'GET',
      headers 
    });
    
    console.log('📥 Response status:', response.status, response.statusText);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.log('📥 Error response body:', errorBody);
      } catch (e) {
        console.log('📥 Could not read error response body');
      }
      
      if (response.status === 401) {
        throw new Error(`Authentication failed (401). Please check your API token. Response: ${errorBody}`);
      } else if (response.status === 404) {
        throw new Error(`Nightscout URL not found (404). Please check your URL. Response: ${errorBody}`);
      } else if (response.status >= 500) {
        throw new Error(`Nightscout server error (${response.status}). Please try again later. Response: ${errorBody}`);
      } else {
        throw new Error(`Failed to fetch Nightscout status: ${response.status} ${response.statusText}. Response: ${errorBody}`);
      }
    }

    const status: NightscoutStatus = await response.json();
    console.log('Raw Nightscout status response keys:', Object.keys(status));
    
    // Log specific IOB-related fields for debugging
    console.log('Checking IOB fields:');
    console.log('  - status.iob:', status.iob);
    console.log('  - status.activity:', status.activity);
    console.log('  - status.openaps?.suggested?.iob:', status.openaps?.suggested?.iob);
    console.log('  - status.openaps?.suggested?.microBolusIOB:', status.openaps?.suggested?.microBolusIOB);
    console.log('  - status.bolus?.amount:', status.bolus?.amount);
    
    // Extract IOB from various possible locations in the status
    let iob = 0;
    let source = 'unknown';
    
    // Check multiple possible IOB locations
    if (status.iob !== undefined && status.iob !== null) {
      iob = status.iob;
      source = 'status.iob';
      console.log('✅ Found IOB in status.iob:', iob);
    } else if (status.openaps?.suggested?.iob !== undefined && status.openaps.suggested.iob !== null) {
      iob = status.openaps.suggested.iob;
      source = 'openaps.suggested.iob';
      console.log('✅ Found IOB in openaps.suggested.iob:', iob);
    } else if (status.openaps?.suggested?.microBolusIOB !== undefined && status.openaps.suggested.microBolusIOB !== null) {
      iob = status.openaps.suggested.microBolusIOB;
      source = 'openaps.suggested.microBolusIOB';
      console.log('✅ Found IOB in openaps.suggested.microBolusIOB:', iob);
    } else if (status.bolus?.amount !== undefined && status.bolus.amount !== null) {
      // Fallback: if no IOB but recent bolus, estimate
      iob = status.bolus.amount * 0.5; // Rough estimate
      source = 'estimated_from_bolus';
      console.log('⚠️ No direct IOB found, estimating from bolus amount:', status.bolus.amount, '→', iob);
    } else if (status.activity !== undefined && status.activity !== null) {
      // Some systems use 'activity' for IOB
      iob = status.activity;
      source = 'status.activity';
      console.log('✅ Found IOB in status.activity:', iob);
    } else {
      console.log('❌ No IOB found in status, trying devicestatus endpoint...');
      
      // Try to fetch from devicestatus endpoint as fallback
      try {
        const devicestatusUrl = `${baseUrl}/api/v1/devicestatus.json?count=1`;
        console.log('🔍 Trying devicestatus endpoint:', devicestatusUrl);
        
        const devicestatusResponse = await fetch(devicestatusUrl, { headers });
        if (devicestatusResponse.ok) {
          const devicestatusData = await devicestatusResponse.json();
          
          if (devicestatusData.length > 0) {
            const latestEntry = devicestatusData[0];
            
            // Check for IOB in devicestatus
            if (latestEntry.openaps?.iob?.iob !== undefined && latestEntry.openaps.iob.iob !== null) {
              iob = latestEntry.openaps.iob.iob;
              source = 'devicestatus.openaps.iob.iob';
              console.log('✅ Found IOB in devicestatus.openaps.iob.iob:', iob);
            } else if (latestEntry.openaps?.iob?.bolusiob !== undefined && latestEntry.openaps.iob.bolusiob !== null) {
              iob = latestEntry.openaps.iob.bolusiob;
              source = 'devicestatus.openaps.iob.bolusiob';
              console.log('✅ Found IOB in devicestatus.openaps.iob.bolusiob:', iob);
            } else if (latestEntry.iob !== undefined && latestEntry.iob !== null) {
              iob = latestEntry.iob;
              source = 'devicestatus.iob';
              console.log('✅ Found IOB in devicestatus.iob:', iob);
            } else {
              console.log('❌ No IOB found in devicestatus either');
            }
          }
        }
      } catch (devicestatusError) {
        console.log('⚠️ Failed to fetch from devicestatus endpoint:', devicestatusError instanceof Error ? devicestatusError.message : 'Unknown error');
      }
    }

    // Validate IOB value
    if (isNaN(iob) || iob < 0) {
      console.log('⚠️ Invalid IOB value detected:', iob, '- setting to 0');
      iob = 0;
      source = 'invalid_value';
    }

    console.log(`🎯 Final Nightscout IOB: ${iob}u (source: ${source})`);

    return {
      iob: Math.round(iob * 10) / 10, // Round to 1 decimal
      status,
      source
    };
  } catch (error) {
    console.error('❌ Error fetching Nightscout IOB:', error);
    return {
      iob: 0,
      status: {},
      source: 'error'
    };
  }
}

/**
 * Calculate IOB using exponential decay model (fallback when Nightscout IOB unavailable)
 * @param treatments Array of recent treatments
 * @param currentTime Current timestamp
 * @param insulinProfile Type of insulin being used
 * @returns IOB calculation result
 */
export function calculateIOB(
  treatments: Treatment[],
  currentTime: Date = new Date(),
  insulinProfile: keyof typeof INSULIN_PROFILES = DEFAULT_INSULIN_PROFILE
): IOBResult {
  const profile = INSULIN_PROFILES[insulinProfile];
  let totalIOB = 0;
  const breakdown: IOBResult['breakdown'] = [];
  const safetyWarnings: string[] = [];

  // Filter for insulin treatments in the last 6 hours
  const recentInsulinTreatments = treatments.filter(treatment => {
    if (treatment.eventType !== 'Bolus' && treatment.eventType !== 'SMB') {
      return false;
    }
    
    if (!treatment.insulin || treatment.insulin <= 0) {
      return false;
    }

    const treatmentTime = new Date(treatment.created_at || treatment.timestamp || '');
    const hoursSinceDose = (currentTime.getTime() - treatmentTime.getTime()) / (1000 * 60 * 60);
    
    // Only consider treatments from the last 6 hours
    return hoursSinceDose >= 0 && hoursSinceDose <= 6;
  });

  // Sort by time (most recent first)
  recentInsulinTreatments.sort((a, b) => {
    const timeA = new Date(a.created_at || a.timestamp || '').getTime();
    const timeB = new Date(b.created_at || b.timestamp || '').getTime();
    return timeB - timeA;
  });

  for (const treatment of recentInsulinTreatments) {
    const treatmentTime = new Date(treatment.created_at || treatment.timestamp || '');
    const timeSinceDose = (currentTime.getTime() - treatmentTime.getTime()) / (1000 * 60 * 60); // hours
    
    if (timeSinceDose < profile.duration) {
      // Calculate remaining IOB using exponential decay
      const remainingIOB = treatment.insulin! * Math.exp(-timeSinceDose / profile.duration);
      const percentageRemaining = (remainingIOB / treatment.insulin!) * 100;
      
      totalIOB += remainingIOB;
      
      breakdown.push({
        treatmentId: treatment._id || treatment.id || 'unknown',
        originalDose: treatment.insulin!,
        remainingIOB,
        timeSinceDose,
        percentageRemaining
      });

      // Add safety warnings
      if (timeSinceDose < 1 && treatment.insulin! > 5) {
        safetyWarnings.push(`Large dose (${treatment.insulin}u) taken ${timeSinceDose.toFixed(1)}h ago - consider reducing next bolus`);
      }
      
      if (timeSinceDose < 0.5) {
        safetyWarnings.push(`Recent insulin dose (${treatment.insulin}u) taken ${timeSinceDose.toFixed(1)}h ago - high IOB risk`);
      }
    }
  }

  // Add general IOB warnings
  if (totalIOB > 5) {
    safetyWarnings.push(`High IOB detected: ${totalIOB.toFixed(1)}u active insulin`);
  }
  
  if (totalIOB > 8) {
    safetyWarnings.push(`Very high IOB: ${totalIOB.toFixed(1)}u - consider delaying or reducing next bolus`);
  }

  return {
    totalIOB: Math.round(totalIOB * 10) / 10, // Round to 1 decimal
    breakdown,
    safetyWarnings
  };
}

/**
 * Calculate Carbs on Board (COB) using exponential decay model
 * @param treatments Array of recent treatments
 * @param currentTime Current timestamp
 * @returns COB calculation result
 */
export function calculateCOB(
  treatments: Treatment[],
  currentTime: Date = new Date()
): COBResult {
  let totalCOB = 0;
  const breakdown: COBResult['breakdown'] = [];
  const safetyWarnings: string[] = [];

  // Filter for carb treatments in the last 4 hours (carbs digest faster than insulin)
  const recentCarbTreatments = treatments.filter(treatment => {
    if (treatment.eventType !== 'Meal Bolus' && treatment.eventType !== 'Carb Correction') {
      return false;
    }
    
    if (!treatment.carbs || treatment.carbs <= 0) {
      return false;
    }

    const treatmentTime = new Date(treatment.created_at || treatment.timestamp || '');
    const hoursSinceDose = (currentTime.getTime() - treatmentTime.getTime()) / (1000 * 60 * 60);
    
    // Only consider treatments from the last 4 hours
    return hoursSinceDose >= 0 && hoursSinceDose <= 4;
  });

  // Sort by time (most recent first)
  recentCarbTreatments.sort((a, b) => {
    const timeA = new Date(a.created_at || a.timestamp || '').getTime();
    const timeB = new Date(b.created_at || b.timestamp || '').getTime();
    return timeB - timeA;
  });

  for (const treatment of recentCarbTreatments) {
    const treatmentTime = new Date(treatment.created_at || treatment.timestamp || '');
    const timeSinceDose = (currentTime.getTime() - treatmentTime.getTime()) / (1000 * 60 * 60); // hours
    
    // Carbs digest faster than insulin - use 2-3 hour half-life
    const carbHalfLife = 2.5; // hours
    if (timeSinceDose < (carbHalfLife * 2)) { // Consider carbs active for 2 half-lives
      // Calculate remaining COB using exponential decay
      const remainingCOB = treatment.carbs! * Math.exp(-timeSinceDose / carbHalfLife);
      const percentageRemaining = (remainingCOB / treatment.carbs!) * 100;
      
      totalCOB += remainingCOB;
      
      breakdown.push({
        treatmentId: treatment._id || treatment.id || 'unknown',
        originalCarbs: treatment.carbs!,
        remainingCOB,
        timeSinceDose,
        percentageRemaining,
        needsInsulin: true // All carbs need insulin coverage
      });

      // Add safety warnings
      if (timeSinceDose < 0.5 && treatment.carbs! > 50) {
        safetyWarnings.push(`Large carb dose (${treatment.carbs}g) taken ${timeSinceDose.toFixed(1)}h ago - monitor glucose closely`);
      }
      
      if (timeSinceDose < 1 && !treatment.insulin) {
        safetyWarnings.push(`Carbs (${treatment.carbs}g) taken ${timeSinceDose.toFixed(1)}h ago without insulin - consider bolus`);
      }
    }
  }

  // Add general COB warnings
  if (totalCOB > 30) {
    safetyWarnings.push(`High COB detected: ${totalCOB.toFixed(1)}g active carbs`);
  }
  
  if (totalCOB > 50) {
    safetyWarnings.push(`Very high COB: ${totalCOB.toFixed(1)}g - consider extending bolus or monitoring closely`);
  }

  return {
    totalCOB: Math.round(totalCOB * 10) / 10, // Round to 1 decimal
    breakdown,
    safetyWarnings
  };
}

/**
 * Fetch current COB from Nightscout
 * @param nightscoutUrl Nightscout URL
 * @param apiToken Nightscout API token
 * @returns Current COB from Nightscout
 */
export async function fetchNightscoutCOB(
  nightscoutUrl: string,
  apiToken: string
): Promise<{ cob: number; status: any; source: string }> {
  try {
    console.log('🔍 Starting Nightscout COB fetch...');
    
    // Clean and validate the Nightscout URL
    let baseUrl = nightscoutUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Try to fetch COB from devicestatus endpoint (where IOB is also stored)
    const devicestatusUrl = `${baseUrl}/api/v1/devicestatus.json?count=1`;
    console.log('🌐 Fetching COB from:', devicestatusUrl);
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      const crypto = await import('crypto');
      const hashedToken = crypto.createHash('sha1').update(apiToken).digest('hex');
      headers['api-secret'] = hashedToken;
    }

    const response = await fetch(devicestatusUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch devicestatus: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.length === 0) {
      console.log('⚠️ No devicestatus entries found');
      return { cob: 0, status: {}, source: 'no_data' };
    }

    const latestEntry = data[0];
    console.log('📊 Raw devicestatus response keys:', Object.keys(latestEntry));
    
    // Look for COB in various locations
    let cob = 0;
    let source = 'not_found';

    if (latestEntry.openaps?.suggested?.COB !== undefined && latestEntry.openaps.suggested.COB !== null) {
      cob = latestEntry.openaps.suggested.COB;
      source = 'openaps.suggested.COB';
      console.log('✅ Found COB in openaps.suggested.COB:', cob);
    } else if (latestEntry.openaps?.cob !== undefined && latestEntry.openaps.cob !== null) {
      cob = latestEntry.openaps.cob;
      source = 'openaps.cob';
      console.log('✅ Found COB in openaps.cob:', cob);
    } else if (latestEntry.cob !== undefined && latestEntry.cob !== null) {
      cob = latestEntry.cob;
      source = 'cob';
      console.log('✅ Found COB in cob:', cob);
    } else {
      console.log('❌ No COB found in devicestatus');
    }

    // Validate COB value
    if (isNaN(cob) || cob < 0) {
      console.log('⚠️ Invalid COB value detected:', cob, '- setting to 0');
      cob = 0;
      source = 'invalid_value';
    }

    console.log(`🎯 Final Nightscout COB: ${cob}g (source: ${source})`);

    return {
      cob: Math.round(cob * 10) / 10, // Round to 1 decimal
      status: latestEntry,
      source
    };
  } catch (error) {
    console.error('❌ Error fetching Nightscout COB:', error);
    return {
      cob: 0,
      status: {},
      source: 'error'
    };
  }
}

/**
 * Calculate safe bolus recommendation using Nightscout's IOB
 * @param carbs Grams of carbohydrates
 * @param currentGlucose Current blood glucose
 * @param targetGlucose Target blood glucose
 * @param carbRatio Carb ratio (grams per unit)
 * @param insulinSensitivity Insulin sensitivity factor (mg/dL per unit)
 * @param nightscoutIOB Current IOB from Nightscout
 * @returns Safe bolus recommendation
 */
export function calculateSafeBolusWithNightscoutIOB(
  carbs: number,
  currentGlucose: number,
  targetGlucose: number,
  carbRatio: number,
  insulinSensitivity: number,
  nightscoutIOB: number,
  nightscoutCOB: number = 0
): BolusRecommendation {
  // Calculate carb bolus for new food
  const carbBolusUnits = carbs / carbRatio;
  
  // Calculate correction bolus
  let correctionUnits = 0;
  if (currentGlucose > targetGlucose) {
    correctionUnits = (currentGlucose - targetGlucose) / insulinSensitivity;
  }
  
  // Round individual components first, then calculate total
  const roundedCarbBolus = Math.round(carbBolusUnits * 10) / 10;
  const roundedCorrection = Math.round(correctionUnits * 10) / 10;
  
  // Total insulin needed for new food and correction
  const totalInsulinNeeded = roundedCarbBolus + roundedCorrection;
  
  // Calculate how much IOB is needed to cover existing carbs on board
  const iobNeededForCOB = nightscoutCOB / carbRatio;
  
  // Calculate how much IOB is available for new insulin needs
  const availableIOB = Math.max(0, nightscoutIOB - iobNeededForCOB);
  
  // Calculate IOB reduction (how much available IOB covers the needed insulin)
  const iobReduction = Math.min(availableIOB, totalInsulinNeeded);
  
  // Safe bolus (total needed minus available IOB)
  const safeBolus = Math.max(0, totalInsulinNeeded - availableIOB);
  
  // Generate clear, formatted calculation note
  let calculationNote = '';
  
  // Step 1: Carb calculation
  calculationNote += `🍎 CARB CALCULATION:\n`;
  calculationNote += `   ${carbs}g ÷ ${carbRatio} = ${carbBolusUnits.toFixed(1)}u\n`;
  
  // Step 2: Correction calculation (if needed)
  if (correctionUnits > 0) {
    calculationNote += `\n📊 CORRECTION CALCULATION:\n`;
    calculationNote += `   (${currentGlucose} - ${targetGlucose}) ÷ ${insulinSensitivity} = ${correctionUnits.toFixed(1)}u\n`;
  }
  
  // Step 3: Total insulin needed
  calculationNote += `\n🎯 TOTAL INSULIN NEEDED:\n`;
  if (correctionUnits > 0) {
    calculationNote += `   ${carbBolusUnits.toFixed(1)}u + ${correctionUnits.toFixed(1)}u = ${totalInsulinNeeded.toFixed(1)}u\n`;
  } else {
    calculationNote += `   ${carbBolusUnits.toFixed(1)}u\n`;
  }
  
  // Step 4: COB calculation (if applicable)
  if (nightscoutCOB > 0) {
    calculationNote += `\n🍞 CARBS ON BOARD (COB):\n`;
    calculationNote += `   ${nightscoutCOB}g ÷ ${carbRatio} = ${iobNeededForCOB.toFixed(1)}u needed\n`;
  }
  
  // Step 5: IOB availability
  calculationNote += `\n💉 INSULIN ON BOARD (IOB):\n`;
  calculationNote += `   Total IOB: ${nightscoutIOB.toFixed(1)}u\n`;
  if (nightscoutCOB > 0) {
    calculationNote += `   IOB for COB: ${iobNeededForCOB.toFixed(1)}u\n`;
    calculationNote += `   Available IOB: ${nightscoutIOB.toFixed(1)}u - ${iobNeededForCOB.toFixed(1)}u = ${availableIOB.toFixed(1)}u\n`;
  }
  
  // Step 6: Final calculation
  calculationNote += `\n✅ SAFE BOLUS CALCULATION:\n`;
  if (nightscoutCOB > 0) {
    calculationNote += `   ${totalInsulinNeeded.toFixed(1)}u needed - ${availableIOB.toFixed(1)}u available = ${safeBolus.toFixed(1)}u\n`;
  } else {
    calculationNote += `   ${totalInsulinNeeded.toFixed(1)}u needed - ${nightscoutIOB.toFixed(1)}u IOB = ${safeBolus.toFixed(1)}u\n`;
  }
  
  // Safety warnings
  const safetyWarnings: string[] = [];
  

  
  
  if (safeBolus > 10) {
    safetyWarnings.push('Large bolus recommended - double-check carb estimate and IOB');
  }
  
  if (nightscoutIOB > 5 && safeBolus > 5) {
    safetyWarnings.push('High IOB with large recommended bolus - high risk of hypoglycemia');
  }

  return {
    carbBolusUnits: roundedCarbBolus,
    correctionUnits: roundedCorrection,
    totalInsulinNeeded: Math.round(totalInsulinNeeded * 10) / 10,
    currentIOB: Math.round(nightscoutIOB * 10) / 10,
    safeBolus: Math.round(safeBolus * 10) / 10,
    iobReduction: Math.round(iobReduction * 10) / 10,
    calculationNote,
    safetyWarnings,
    settings: {
      carbRatio,
      carbRatioTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      insulinSensitivity,
      targetGlucose,
      currentGlucose
    }
  };
}

/**
 * Calculate safe bolus recommendation considering IOB (fallback method)
 * @param carbs Grams of carbohydrates
 * @param currentGlucose Current blood glucose
 * @param targetGlucose Target blood glucose
 * @param carbRatio Carb ratio (grams per unit)
 * @param insulinSensitivity Insulin sensitivity factor (mg/dL per unit)
 * @param currentIOB Current insulin on board
 * @returns Safe bolus recommendation
 */
export function calculateSafeBolus(
  carbs: number,
  currentGlucose: number,
  targetGlucose: number,
  carbRatio: number,
  insulinSensitivity: number,
  currentIOB: number,
  currentCOB: number = 0
): BolusRecommendation {
  // Calculate carb bolus
  const carbBolusUnits = carbs / carbRatio;
  
  // Calculate correction bolus
  let correctionUnits = 0;
  if (currentGlucose > targetGlucose) {
    correctionUnits = (currentGlucose - targetGlucose) / insulinSensitivity;
  }
  
  // Round individual components first, then calculate total
  const roundedCarbBolus = Math.round(carbBolusUnits * 10) / 10;
  const roundedCorrection = Math.round(correctionUnits * 10) / 10;
  
  // Total insulin needed (calculated from rounded values)
  const totalInsulinNeeded = roundedCarbBolus + roundedCorrection;
  
  // Calculate how much IOB is needed to cover existing carbs on board
  const iobNeededForCOB = currentCOB / carbRatio;
  
  // Calculate how much IOB is available for new insulin needs
  const availableIOB = Math.max(0, currentIOB - iobNeededForCOB);
  
  // Calculate IOB reduction (how much available IOB covers the needed insulin)
  const iobReduction = Math.min(availableIOB, totalInsulinNeeded);
  
  // Safe bolus (total needed minus available IOB)
  const safeBolus = Math.max(0, totalInsulinNeeded - availableIOB);
  
  // Generate clear, formatted calculation note
  let calculationNote = '';
  
  // Step 1: Carb calculation
  calculationNote += `🍎 CARB CALCULATION:\n`;
  calculationNote += `   ${carbs}g ÷ ${carbRatio} = ${carbBolusUnits.toFixed(1)}u\n`;
  
  // Step 2: Correction calculation (if needed)
  if (correctionUnits > 0) {
    calculationNote += `\n📊 CORRECTION CALCULATION:\n`;
    calculationNote += `   (${currentGlucose} - ${targetGlucose}) ÷ ${insulinSensitivity} = ${correctionUnits.toFixed(1)}u\n`;
  }
  
  // Step 3: Total insulin needed
  calculationNote += `\n🎯 TOTAL INSULIN NEEDED:\n`;
  if (correctionUnits > 0) {
    calculationNote += `   ${carbBolusUnits.toFixed(1)}u + ${correctionUnits.toFixed(1)}u = ${totalInsulinNeeded.toFixed(1)}u\n`;
  } else {
    calculationNote += `   ${carbBolusUnits.toFixed(1)}u\n`;
  }
  
  // Step 4: COB calculation (if applicable)
  if (currentCOB > 0) {
    calculationNote += `\n🍞 CARBS ON BOARD (COB):\n`;
    calculationNote += `   ${currentCOB}g ÷ ${carbRatio} = ${iobNeededForCOB.toFixed(1)}u needed\n`;
  }
  
  // Step 5: IOB availability
  calculationNote += `\n💉 INSULIN ON BOARD (IOB):\n`;
  calculationNote += `   Total IOB: ${currentIOB.toFixed(1)}u\n`;
  if (currentCOB > 0) {
    calculationNote += `   IOB for COB: ${iobNeededForCOB.toFixed(1)}u\n`;
    calculationNote += `   Available IOB: ${currentIOB.toFixed(1)}u - ${iobNeededForCOB.toFixed(1)}u = ${availableIOB.toFixed(1)}u\n`;
  }
  
  // Step 6: Final calculation
  calculationNote += `\n✅ SAFE BOLUS CALCULATION:\n`;
  if (currentCOB > 0) {
    calculationNote += `   ${totalInsulinNeeded.toFixed(1)}u needed - ${availableIOB.toFixed(1)}u available = ${safeBolus.toFixed(1)}u\n`;
  } else {
    calculationNote += `   ${totalInsulinNeeded.toFixed(1)}u needed - ${currentIOB.toFixed(1)}u IOB = ${safeBolus.toFixed(1)}u\n`;
  }
  
  // Safety warnings
  const safetyWarnings: string[] = [];
  

  

  
  if (safeBolus > 10) {
    safetyWarnings.push('Large bolus recommended - double-check carb estimate and IOB calculation');
  }
  
  if (currentIOB > 5 && safeBolus > 5) {
    safetyWarnings.push('High IOB with large recommended bolus - high risk of hypoglycemia');
  }

  return {
    carbBolusUnits: roundedCarbBolus,
    correctionUnits: roundedCorrection,
    totalInsulinNeeded: Math.round(totalInsulinNeeded * 10) / 10,
    currentIOB: Math.round(currentIOB * 10) / 10,
    safeBolus: Math.round(safeBolus * 10) / 10,
    iobReduction: Math.round(iobReduction * 10) / 10,
    calculationNote,
    safetyWarnings,
    settings: {
      carbRatio,
      carbRatioTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      insulinSensitivity,
      targetGlucose,
      currentGlucose
    }
  };
}

/**
 * Fetch recent treatments from Nightscout for IOB calculation
 * @param nightscoutUrl Nightscout URL
 * @param apiToken Nightscout API token
 * @param hoursBack Number of hours to look back (default: 6)
 * @returns Array of treatments
 */
export async function fetchRecentTreatments(
  nightscoutUrl: string,
  apiToken: string,
  hoursBack: number = 6
): Promise<Treatment[]> {
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hoursBack * 60 * 60 * 1000));
    
    // Clean and validate the Nightscout URL
    let baseUrl = nightscoutUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    const url = new URL('/api/v1/treatments', baseUrl);
    url.searchParams.set('find[created_at][$gte]', startTime.toISOString());
    url.searchParams.set('find[created_at][$lte]', endTime.toISOString());
    url.searchParams.set('count', '100');
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (apiToken) {
      const crypto = await import('crypto');
      const hashedToken = crypto.createHash('sha1').update(apiToken).digest('hex');
      headers['api-secret'] = hashedToken;
    }
    
    const response = await fetch(url.toString(), {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch treatments: ${response.status}`);
    }

    const treatments = await response.json();
    
    // Filter for insulin treatments only
    return treatments.filter((treatment: any) => 
      treatment.eventType === 'Bolus' || treatment.eventType === 'SMB'
    );
  } catch (error) {
    console.error('Error fetching recent treatments:', error);
    return [];
  }
} 