import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

interface Reading {
  sgv: number;
  date: Date;
  direction?: string;
  source: string;
}

interface ProfileData {
  basal: Array<{ time: string; value: number }>;
  carbratio: Array<{ time: string; value: number }>;
  sens: Array<{ time: string; value: number }>;
  target_low: Array<{ time: string; value: number }>;
  target_high: Array<{ time: string; value: number }>;
  dia: number;
  units: string;
}

interface TherapyAdjustment {
  type: 'basal' | 'carbratio' | 'sens' | 'target';
  timeSlot: string;
  currentValue: number;
  suggestedValue: number;
  adjustmentPercentage: number;
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
}

interface AdjustmentSuggestions {
  basalAdjustments: TherapyAdjustment[];
  carbRatioAdjustments: TherapyAdjustment[];
  sensitivityAdjustments: TherapyAdjustment[];
  targetAdjustments: TherapyAdjustment[];
  overallRecommendations: string[];
  safetyWarnings: string[];
  analysisMetrics: {
    timeInRange: number;
    timeAboveRange: number;
    timeBelowRange: number;
    averageGlucose: number;
    glucoseVariability: number;
    dataQuality: 'poor' | 'fair' | 'good' | 'excellent';
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { analysisDateRange = 14 } = await request.json();

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Get current profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || !profile.data) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'DIABETES_PROFILE_NOT_SETUP',
          message: 'Please set up your diabetes profile first before analyzing therapy adjustments.' 
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const profileData = profile.data as unknown as ProfileData;

    // Get settings for targets
    const settings = await prisma.settings.findUnique({
      where: { userId: user.id },
    });

    const lowTarget = settings?.lowGlucose || 70;
    const highTarget = settings?.highGlucose || 180;

    // Fetch recent readings
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysisDateRange);

    const readings = await prisma.glucoseReading.findMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (readings.length < 50) {
      return NextResponse.json({
        error: 'Insufficient data for reliable therapy adjustments',
        message: `Need at least 50 readings, found ${readings.length}`,
        suggestions: [],
      });
    }

    // Transform readings to match interface
    const transformedReadings: Reading[] = readings.map((r: any) => ({
      sgv: r.sgv,
      date: r.timestamp, // Map timestamp to date for the interface
      direction: r.direction || undefined,
      source: r.source,
    }));



    // Analyze patterns and generate suggestions
    const suggestions = analyzeAndSuggestAdjustments(
      transformedReadings,
      profileData,
      lowTarget,
      highTarget
    );

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error generating therapy adjustments:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to generate adjustments',
      { status: 500 }
    );
  }
}

function analyzeAndSuggestAdjustments(
  readings: Reading[],
  profile: ProfileData,
  lowTarget: number,
  highTarget: number
): AdjustmentSuggestions {
  // Calculate basic metrics
  const totalReadings = readings.length;
  const averageGlucose = readings.reduce((sum, r) => sum + r.sgv, 0) / totalReadings;
  const inRange = readings.filter(r => r.sgv >= lowTarget && r.sgv <= highTarget).length;
  const aboveRange = readings.filter(r => r.sgv > highTarget).length;
  const belowRange = readings.filter(r => r.sgv < lowTarget).length;

  const timeInRange = (inRange / totalReadings) * 100;
  const timeAboveRange = (aboveRange / totalReadings) * 100;
  const timeBelowRange = (belowRange / totalReadings) * 100;

  // Calculate glucose variability
  const variance = readings.reduce((sum, r) => sum + Math.pow(r.sgv - averageGlucose, 2), 0) / totalReadings;
  const standardDeviation = Math.sqrt(variance);
  const glucoseVariability = (standardDeviation / averageGlucose) * 100;

  // Data quality assessment
  const dataQuality = assessDataQuality(readings, totalReadings);

  // Analyze by time periods for basal adjustments
  const basalAdjustments = analyzeBasalNeeds(readings, profile.basal, lowTarget, highTarget);
  
  // Analyze carb ratios (would need meal data for full analysis)
  const carbRatioAdjustments = analyzeCarbRatios(readings, profile.carbratio, averageGlucose, highTarget);
  
  // Analyze insulin sensitivity
  const sensitivityAdjustments = analyzeSensitivity(readings, profile.sens, glucoseVariability);
  
  // Analyze targets
  const targetAdjustments = analyzeTargets(profile, timeInRange, timeBelowRange, timeAboveRange);

  // Generate overall recommendations
  const overallRecommendations = generateOverallRecommendations(
    timeInRange,
    timeBelowRange,
    timeAboveRange,
    glucoseVariability,
    basalAdjustments,
    carbRatioAdjustments
  );

  // Generate safety warnings
  const safetyWarnings = generateSafetyWarnings(
    timeBelowRange,
    glucoseVariability,
    basalAdjustments,
    carbRatioAdjustments
  );

  return {
    basalAdjustments,
    carbRatioAdjustments,
    sensitivityAdjustments,
    targetAdjustments,
    overallRecommendations,
    safetyWarnings,
    analysisMetrics: {
      timeInRange: Math.round(timeInRange),
      timeAboveRange: Math.round(timeAboveRange),
      timeBelowRange: Math.round(timeBelowRange),
      averageGlucose: Math.round(averageGlucose),
      glucoseVariability: Math.round(glucoseVariability),
      dataQuality,
    },
  };
}

function assessDataQuality(readings: Reading[], totalReadings: number): 'poor' | 'fair' | 'good' | 'excellent' {
  const daysOfData = (readings[readings.length - 1].date.getTime() - readings[0].date.getTime()) / (1000 * 60 * 60 * 24);
  const readingsPerDay = totalReadings / daysOfData;
  
  if (readingsPerDay >= 250) return 'excellent'; // ~17 min intervals
  if (readingsPerDay >= 200) return 'good';      // ~7 min intervals
  if (readingsPerDay >= 100) return 'fair';      // ~14 min intervals
  return 'poor';
}

function analyzeBasalNeeds(
  readings: Reading[],
  currentBasal: Array<{ time: string; value: number }>,
  lowTarget: number,
  highTarget: number
): TherapyAdjustment[] {
  const adjustments: TherapyAdjustment[] = [];
  const adjustmentsByTimeSlot = new Map<string, TherapyAdjustment>();
  
  // Ensure we have a basal rate starting at midnight (00:00)
  let normalizedBasal = [...currentBasal];
  
  // Sort by time first
  normalizedBasal.sort((a, b) => {
    const hourA = parseInt(a.time.split(':')[0]);
    const hourB = parseInt(b.time.split(':')[0]);
    return hourA - hourB;
  });
  
  const hasMidnightRate = normalizedBasal.some(b => b.time === '00:00');
  
  if (!hasMidnightRate && normalizedBasal.length > 0) {
    // Add a midnight rate using the first available rate
    normalizedBasal.unshift({
      time: '00:00',
      value: normalizedBasal[0].value
    });
  }
  
  // Define time periods for analysis
  const timePeriods = [
    { name: 'Overnight', hours: [23, 0, 1, 2, 3, 4, 5, 6], description: 'overnight' },
    { name: 'Morning', hours: [6, 7, 8, 9, 10, 11], description: 'morning' },
    { name: 'Afternoon', hours: [12, 13, 14, 15, 16, 17], description: 'afternoon' },
    { name: 'Evening', hours: [18, 19, 20, 21, 22], description: 'evening' }
  ];

  timePeriods.forEach(period => {
    const periodReadings = readings.filter(r => {
      const hour = r.date.getHours();
      return period.hours.includes(hour);
    });

    if (periodReadings.length < 15) {
      return; // Not enough data for this period
    }

    const periodAvg = periodReadings.reduce((sum, r) => sum + r.sgv, 0) / periodReadings.length;
    const periodLows = periodReadings.filter(r => r.sgv < lowTarget).length;
    const periodHighs = periodReadings.filter(r => r.sgv > highTarget).length;
    const periodLowPercent = (periodLows / periodReadings.length) * 100;
    const periodHighPercent = (periodHighs / periodReadings.length) * 100;

    // Find relevant basal rates for this period
    const relevantBasalRates = normalizedBasal.filter(b => {
      const hour = parseInt(b.time.split(':')[0]);
      return period.hours.includes(hour);
    });

    // If no exact matches, find the active basal rate for each hour in the period
    const activeBasalRates = new Map<string, { time: string; value: number }>();
    
    period.hours.forEach(hour => {
      // Find the basal rate that would be active at this hour
      let activeBasal = normalizedBasal[0]; // Default to first rate
      
      // Sort basal rates by time to ensure proper order
      const sortedBasal = [...normalizedBasal].sort((a, b) => {
        const hourA = parseInt(a.time.split(':')[0]);
        const hourB = parseInt(b.time.split(':')[0]);
        return hourA - hourB;
      });
      
      // Find the most recent basal rate that starts at or before this hour
      for (let i = sortedBasal.length - 1; i >= 0; i--) {
        const basal = sortedBasal[i];
        const basalHour = parseInt(basal.time.split(':')[0]);
        if (basalHour <= hour) {
          activeBasal = basal;
          break;
        }
      }
      
      activeBasalRates.set(activeBasal.time, activeBasal);
    });

    // Convert map back to array for processing
    const basalRatesToAnalyze = Array.from(activeBasalRates.values());

    basalRatesToAnalyze.forEach(basalRate => {
      let adjustmentPercentage = 0;
      let reasoning = '';
      let priority: 'low' | 'medium' | 'high' = 'low';
      let confidence: 'low' | 'medium' | 'high' = 'medium';

      // Safety first - check for hypoglycemia
      if (periodLowPercent > 4) {
        adjustmentPercentage = periodLowPercent > 10 ? -20 : -15;
        reasoning = `${periodLowPercent.toFixed(1)}% of ${period.description} readings below ${lowTarget} mg/dL. Reduce basal rate for safety.`;
        priority = periodLowPercent > 10 ? 'high' : 'medium';
        confidence = 'high';
      }
      // Check for persistent highs
      else if (periodHighPercent > 40 || periodAvg > highTarget + 30) {
        // More aggressive for very poor control
        if (periodAvg > 220) {
          adjustmentPercentage = 20;
          priority = 'high';
          reasoning = `${period.description} average is ${periodAvg.toFixed(0)} mg/dL (very high). Consider significant basal increase.`;
        } else if (periodHighPercent > 60 || periodAvg > highTarget + 50) {
          adjustmentPercentage = 15;
          priority = 'high';
          reasoning = `${periodHighPercent.toFixed(1)}% of ${period.description} readings above ${highTarget} mg/dL. Average: ${periodAvg.toFixed(0)} mg/dL. Consider basal increase.`;
        } else if (periodHighPercent > 40) {
          adjustmentPercentage = 10;
          priority = 'medium';
          reasoning = `${periodHighPercent.toFixed(1)}% of ${period.description} readings above ${highTarget} mg/dL. Consider modest basal increase.`;
        } else {
          adjustmentPercentage = 8;
          priority = 'medium';
          reasoning = `${period.description} average of ${periodAvg.toFixed(0)} mg/dL is elevated. Consider small basal increase.`;
        }
        confidence = 'high';
      }
      // Check for moderately elevated averages
      else if (periodAvg > highTarget + 15) {
        adjustmentPercentage = 5;
        reasoning = `${period.description} average of ${periodAvg.toFixed(0)} mg/dL is moderately elevated. Consider small basal increase.`;
        priority = 'low';
        confidence = 'medium';
      }

      if (adjustmentPercentage !== 0) {
        const suggestedValue = Math.round((basalRate.value * (1 + adjustmentPercentage / 100)) * 100) / 100;
        
        const adjustment: TherapyAdjustment = {
          type: 'basal',
          timeSlot: basalRate.time,
          currentValue: basalRate.value,
          suggestedValue: Math.max(0.05, suggestedValue), // Minimum 0.05 units
          adjustmentPercentage,
          reasoning,
          confidence,
          priority,
        };

        // Check if we already have an adjustment for this time slot
        const existingAdjustment = adjustmentsByTimeSlot.get(basalRate.time);
        
        if (!existingAdjustment) {
          // No existing adjustment, add this one
          adjustmentsByTimeSlot.set(basalRate.time, adjustment);
        } else {
          // We have an existing adjustment, keep the one with higher priority
          if (getPriorityLevel(priority) > getPriorityLevel(existingAdjustment.priority)) {
            adjustmentsByTimeSlot.set(basalRate.time, adjustment);
          } else if (getPriorityLevel(priority) === getPriorityLevel(existingAdjustment.priority)) {
            // Same priority, keep the one with higher confidence
            if (getConfidenceLevel(confidence) > getConfidenceLevel(existingAdjustment.confidence)) {
              adjustmentsByTimeSlot.set(basalRate.time, adjustment);
            }
          }
        }
      }
    });
  });

  // Convert map back to array and sort by time slot
  const finalAdjustments = Array.from(adjustmentsByTimeSlot.values()).sort((a, b) => {
    const hourA = parseInt(a.timeSlot.split(':')[0]);
    const hourB = parseInt(b.timeSlot.split(':')[0]);
    return hourA - hourB;
  });
  return finalAdjustments;
}

// Helper function to get priority level for comparison
function getPriorityLevel(priority: 'low' | 'medium' | 'high'): number {
  switch (priority) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

// Helper function to get confidence level for comparison
function getConfidenceLevel(confidence: 'low' | 'medium' | 'high'): number {
  switch (confidence) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function analyzeCarbRatios(
  readings: Reading[],
  currentRatios: Array<{ time: string; value: number }>,
  averageGlucose: number,
  highTarget: number
): TherapyAdjustment[] {
  const adjustments: TherapyAdjustment[] = [];
  
  // Define meal periods with more granular analysis
  const mealPeriods = [
    { name: 'Breakfast', hours: [6, 7, 8, 9, 10], ratioTimes: ['00:00', '06:00', '06:30', '07:00'] },
    { name: 'Lunch', hours: [11, 12, 13, 14, 15], ratioTimes: ['10:30', '11:00', '12:00'] },
    { name: 'Dinner', hours: [17, 18, 19, 20, 21], ratioTimes: ['15:30', '17:00', '18:00'] }
  ];

  mealPeriods.forEach(mealPeriod => {
    const mealReadings = readings.filter(r => {
      const hour = r.date.getHours();
      return mealPeriod.hours.includes(hour);
    });

    if (mealReadings.length < 20) {
      return; // Not enough meal-time data
    }

    const mealAvg = mealReadings.reduce((sum, r) => sum + r.sgv, 0) / mealReadings.length;
    const mealHighs = mealReadings.filter(r => r.sgv > highTarget).length;
    const mealHighPercent = (mealHighs / mealReadings.length) * 100;

    // More aggressive thresholds for poor control
    const shouldAdjust = (
      mealHighPercent > 30 || // Lower threshold
      mealAvg > highTarget + 25 || // Lower threshold
      (mealAvg > 200 && mealHighPercent > 20) // Very high averages
    );

    if (shouldAdjust) {
      // Find relevant carb ratios for this meal period
      const relevantRatios = currentRatios.filter(ratio => 
        mealPeriod.ratioTimes.includes(ratio.time)
      );

      // If no exact matches, find the active ratio
      if (relevantRatios.length === 0) {
        const sampleHour = mealPeriod.hours[Math.floor(mealPeriod.hours.length / 2)];
        let activeRatio = currentRatios[0];
        
        for (const ratio of currentRatios) {
          const ratioHour = parseInt(ratio.time.split(':')[0]);
          const ratioMinute = parseInt(ratio.time.split(':')[1]);
          const ratioTimeInHours = ratioHour + ratioMinute / 60;
          
          if (ratioTimeInHours <= sampleHour) {
            activeRatio = ratio;
          } else {
            break;
          }
        }
        relevantRatios.push(activeRatio);
      }

      relevantRatios.forEach(ratio => {
        let adjustmentPercentage = 0;
        let priority: 'low' | 'medium' | 'high' = 'medium';

        if (mealAvg > 220) {
          adjustmentPercentage = -15; // Stronger ratio
          priority = 'high';
        } else if (mealHighPercent > 50 || mealAvg > highTarget + 40) {
          adjustmentPercentage = -12;
          priority = 'high';
        } else if (mealHighPercent > 30) {
          adjustmentPercentage = -8;
          priority = 'medium';
        } else {
          adjustmentPercentage = -5;
          priority = 'low';
        }

        const suggestedValue = Math.round((ratio.value * (1 + adjustmentPercentage / 100)) * 10) / 10;
        
        adjustments.push({
          type: 'carbratio',
          timeSlot: ratio.time,
          currentValue: ratio.value,
          suggestedValue: Math.max(1, suggestedValue),
          adjustmentPercentage,
          reasoning: `${mealPeriod.name}: ${mealHighPercent.toFixed(1)}% above target, average ${mealAvg.toFixed(0)} mg/dL. Consider stronger carb ratio.`,
          confidence: 'medium',
          priority,
        });
      });
    }
  });

  return adjustments;
}

function analyzeSensitivity(
  readings: Reading[],
  currentSens: Array<{ time: string; value: number }>,
  glucoseVariability: number
): TherapyAdjustment[] {
  const adjustments: TherapyAdjustment[] = [];
  
  if (glucoseVariability > 40) {
    // High variability might indicate sensitivity issues
    currentSens.forEach(sens => {
      adjustments.push({
        type: 'sens',
        timeSlot: sens.time,
        currentValue: sens.value,
        suggestedValue: sens.value, // Keep same for now
        adjustmentPercentage: 0,
        reasoning: `High glucose variability (${glucoseVariability.toFixed(1)}%). Consider reviewing insulin sensitivity with healthcare provider.`,
        confidence: 'low',
        priority: 'low',
      });
    });
  }

  return adjustments;
}

function analyzeTargets(
  profile: ProfileData,
  timeInRange: number,
  timeBelowRange: number,
  timeAboveRange: number
): TherapyAdjustment[] {
  const adjustments: TherapyAdjustment[] = [];
  
  if (timeBelowRange > 4) {
    // Too many lows - suggest raising targets
    profile.target_low.forEach(target => {
      adjustments.push({
        type: 'target',
        timeSlot: target.time,
        currentValue: target.value,
        suggestedValue: target.value + 10,
        adjustmentPercentage: 9.1, // (10/110)*100
        reasoning: `${timeBelowRange.toFixed(1)}% time below range. Consider raising low target for safety.`,
        confidence: 'high',
        priority: 'high',
      });
    });
  }

  return adjustments;
}

function generateOverallRecommendations(
  timeInRange: number,
  timeBelowRange: number,
  timeAboveRange: number,
  glucoseVariability: number,
  basalAdjustments: TherapyAdjustment[],
  carbRatioAdjustments: TherapyAdjustment[]
): string[] {
  const recommendations: string[] = [];

  // More urgent messaging for very poor control
  if (timeInRange < 50) {
    recommendations.push(`⚠️ URGENT: Time in range is only ${timeInRange.toFixed(1)}% (target >70%). This indicates very poor glucose control requiring immediate attention.`);
  } else if (timeInRange < 70) {
    recommendations.push(`Time in range is ${timeInRange.toFixed(1)}%. Target is >70%. Focus on the suggested adjustments below.`);
  }

  if (timeBelowRange > 4) {
    recommendations.push(`❗ SAFETY PRIORITY: Time below range is ${timeBelowRange.toFixed(1)}%. This exceeds the 4% safety threshold. Prioritize reducing hypoglycemia risk first.`);
  }

  if (timeAboveRange > 50) {
    recommendations.push(`Time above range is ${timeAboveRange.toFixed(1)}% which is very high. Multiple therapy adjustments may be needed.`);
  }

  if (glucoseVariability > 50) {
    recommendations.push(`Glucose variability is very high at ${glucoseVariability.toFixed(1)}%. Consider reviewing meal timing, carb counting accuracy, and stress management.`);
  } else if (glucoseVariability > 36) {
    recommendations.push(`Glucose variability is ${glucoseVariability.toFixed(1)}%. Consider more consistent meal timing and carb counting.`);
  }

  if (basalAdjustments.length > 0) {
    const highPriorityBasal = basalAdjustments.filter(adj => adj.priority === 'high').length;
    if (highPriorityBasal > 0) {
      recommendations.push(`🔴 ${highPriorityBasal} high-priority basal adjustments suggested. These should be addressed first.`);
    }
    recommendations.push(`${basalAdjustments.length} basal rate adjustments suggested. Start with the highest priority changes.`);
  }

  if (carbRatioAdjustments.length > 0) {
    const highPriorityCarb = carbRatioAdjustments.filter(adj => adj.priority === 'high').length;
    if (highPriorityCarb > 0) {
      recommendations.push(`🔴 ${highPriorityCarb} high-priority carb ratio adjustments suggested.`);
    }
    recommendations.push(`${carbRatioAdjustments.length} carb ratio adjustments suggested. Test one change at a time.`);
  }

  // Add specific guidance for very poor control
  if (timeInRange < 50 && (basalAdjustments.length > 0 || carbRatioAdjustments.length > 0)) {
    recommendations.push(`With your current control, consider working with your healthcare team to implement multiple changes systematically.`);
    recommendations.push(`Document all changes and monitor glucose patterns for 3-5 days after each adjustment.`);
  }

  if (timeInRange < 50) {
    recommendations.push('⚠️ With very poor glucose control, consider scheduling an urgent appointment with your endocrinologist.');
  }

  return recommendations;
}

function generateSafetyWarnings(
  timeBelowRange: number,
  glucoseVariability: number,
  basalAdjustments: TherapyAdjustment[],
  carbRatioAdjustments: TherapyAdjustment[]
): string[] {
  const warnings: string[] = [];

  if (timeBelowRange > 4) {
    warnings.push('🚨 HIGH HYPOGLYCEMIA RISK: Time below range exceeds 4%. Prioritize safety over tight control.');
  }

  if (glucoseVariability > 60) {
    warnings.push('🚨 EXTREME VARIABILITY: Glucose swings are dangerous. Immediate medical consultation recommended.');
  } else if (glucoseVariability > 50) {
    warnings.push('⚠️ VERY HIGH VARIABILITY: Glucose swings are significant. Consider reviewing overall diabetes management strategy.');
  }

  const aggressiveBasalIncreases = basalAdjustments.filter(adj => adj.adjustmentPercentage > 15);
  if (aggressiveBasalIncreases.length > 0) {
    warnings.push('⚠️ LARGE BASAL INCREASES: Some suggested increases are >15%. Consider smaller incremental changes or consult your healthcare provider.');
  }

  const aggressiveCarbChanges = carbRatioAdjustments.filter(adj => Math.abs(adj.adjustmentPercentage) > 15);
  if (aggressiveCarbChanges.length > 0) {
    warnings.push('⚠️ SIGNIFICANT CARB RATIO CHANGES: Large adjustments suggested. Test carefully with known meals.');
  }

  // Additional warnings for very poor control
  const totalHighPriorityChanges = [
    ...basalAdjustments.filter(adj => adj.priority === 'high'),
    ...carbRatioAdjustments.filter(adj => adj.priority === 'high')
  ].length;

  if (totalHighPriorityChanges > 3) {
    warnings.push('⚠️ MULTIPLE HIGH-PRIORITY CHANGES: Several urgent adjustments suggested. Consider professional guidance for systematic implementation.');
  }

  // Always include these critical safety warnings
  warnings.push('Always consult with your healthcare provider before making therapy adjustments.');
  warnings.push('Make only one change at a time and monitor for 3-5 days before making additional adjustments.');

  if (warnings.length === 0) {
    warnings.push('✅ No major safety concerns identified with suggested adjustments.');
  }

  return warnings;
} 