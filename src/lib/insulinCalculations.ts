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
    console.log('📊 Raw Nightscout status response keys:', Object.keys(status));
    
    // Log specific IOB-related fields for debugging
    console.log('🔍 Checking IOB fields:');
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
      console.log('❌ No IOB found in any expected location');
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
  nightscoutIOB: number
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
  
  // Calculate IOB reduction (how much IOB covers the needed insulin)
  const iobReduction = Math.min(nightscoutIOB, totalInsulinNeeded);
  
  // Safe bolus (total needed minus IOB)
  const safeBolus = Math.max(0, totalInsulinNeeded - nightscoutIOB);
  
  // Generate calculation note
  let calculationNote = `${carbs}g ÷ ${carbRatio} = ${carbBolusUnits.toFixed(1)}u`;
  if (correctionUnits > 0) {
    calculationNote += ` + ${correctionUnits.toFixed(1)}u correction`;
  }
  calculationNote += ` - ${nightscoutIOB.toFixed(1)}u IOB (from Nightscout) = ${safeBolus.toFixed(1)}u`;
  
  // Safety warnings
  const safetyWarnings: string[] = [];
  
  if (nightscoutIOB > 0) {
    safetyWarnings.push(`Active insulin detected: ${nightscoutIOB.toFixed(1)}u IOB (from Nightscout)`);
  }
  
  if (safeBolus < 0.5 && totalInsulinNeeded > 0) {
    safetyWarnings.push('IOB covers most/all of needed insulin - consider delaying bolus');
  }
  
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
  currentIOB: number
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
  
  // Calculate IOB reduction (how much IOB covers the needed insulin)
  const iobReduction = Math.min(currentIOB, totalInsulinNeeded);
  
  // Safe bolus (total needed minus IOB)
  const safeBolus = Math.max(0, totalInsulinNeeded - currentIOB);
  
  // Generate calculation note
  let calculationNote = `${carbs}g ÷ ${carbRatio} = ${carbBolusUnits.toFixed(1)}u`;
  if (correctionUnits > 0) {
    calculationNote += ` + ${correctionUnits.toFixed(1)}u correction`;
  }
  calculationNote += ` - ${currentIOB.toFixed(1)}u IOB = ${safeBolus.toFixed(1)}u`;
  
  // Safety warnings
  const safetyWarnings: string[] = [];
  
  if (currentIOB > 0) {
    safetyWarnings.push(`Active insulin detected: ${currentIOB.toFixed(1)}u IOB`);
  }
  
  if (safeBolus < 0.5 && totalInsulinNeeded > 0) {
    safetyWarnings.push('IOB covers most/all of needed insulin - consider delaying bolus');
  }
  
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