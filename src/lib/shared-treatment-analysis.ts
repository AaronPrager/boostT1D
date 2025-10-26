// Shared treatment analysis functions for web and iOS apps
// This ensures both platforms use the same logic for analyzing treatment patterns

export interface TreatmentAnalysis {
  correctionCount: number;
  carbCount: number;
  tempBasalCount: number;
  frequentCorrections: boolean;
  frequentCarbs: boolean;
  frequentTempBasals: boolean;
  uniqueEventTypes: string[];
  treatmentsWithCarbs: number;
}

export interface Treatment {
  eventType?: string;
  carbs?: number;
  insulin?: number;
  created_at?: string;
  timestamp?: string;
  notes?: string;
}

/**
 * Unified treatment analysis function (shared approach for web and iOS)
 * Analyzes treatment patterns to identify frequent corrections, carb treatments, and temp basals
 */
export function analyzeTreatmentPatterns(treatments: Treatment[], timeRangeDays: number): TreatmentAnalysis {
  const uniqueEventTypes = [...new Set(treatments.map(t => t.eventType).filter((et): et is string => Boolean(et)))].sort();
  const treatmentsWithCarbs = treatments.filter(t => t.carbs && t.carbs > 0);
  
  const correctionCount = treatments.filter(t => 
    t.eventType === 'Correction Bolus' || t.eventType === 'Bolus'
  ).length;
  
  // Improved carb detection - look for any treatment with carbs > 0, regardless of event type
  const carbCount = treatments.filter(t => 
    (t.carbs && t.carbs > 0) || 
    t.eventType === 'Carb' || 
    t.eventType === 'Meal Bolus' ||
    t.eventType === 'Carb Correction' ||
    (t.eventType === 'Bolus' && t.carbs && t.carbs > 0)
  ).length;
  
  const tempBasalCount = treatments.filter(t => t.eventType === 'Temp Basal').length;
  
  const frequentCorrections = correctionCount > timeRangeDays * 3;
  const frequentCarbs = carbCount > timeRangeDays * 4;
  const frequentTempBasals = tempBasalCount > timeRangeDays * 2;
  
  return {
    correctionCount,
    carbCount,
    tempBasalCount,
    frequentCorrections,
    frequentCarbs,
    frequentTempBasals,
    uniqueEventTypes,
    treatmentsWithCarbs: treatmentsWithCarbs.length
  };
}

/**
 * Determines if carb ratio adjustment is needed based on treatment patterns
 */
export function shouldAdjustCarbRatio(treatmentAnalysis: TreatmentAnalysis, timeRangeDays: number): boolean {
  return treatmentAnalysis.frequentCarbs;
}

/**
 * Calculates carb ratio adjustment priority based on treatment frequency
 */
export function getCarbRatioPriority(treatmentAnalysis: TreatmentAnalysis, timeRangeDays: number): 'low' | 'medium' | 'high' {
  const carbsPerDay = treatmentAnalysis.carbCount / timeRangeDays;
  
  if (carbsPerDay > 6) {
    return 'high'; // Very frequent carb treatments
  } else if (carbsPerDay > 5) {
    return 'medium'; // Moderately frequent
  } else {
    return 'low'; // Less frequent
  }
}

/**
 * Generates carb ratio adjustment reasoning based on treatment analysis
 */
export function generateCarbRatioReasoning(treatmentAnalysis: TreatmentAnalysis, timeRangeDays: number, mealPeriodName: string = 'Meal times'): string {
  const carbsPerDay = treatmentAnalysis.carbCount / timeRangeDays;
  return `${mealPeriodName} analysis: ${treatmentAnalysis.carbCount} carb treatments in ${timeRangeDays} days (${carbsPerDay.toFixed(1)} per day). Consider stronger carb ratio to reduce post-meal corrections.`;
}
