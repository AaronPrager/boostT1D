'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

type Reading = {
  sgv: number;
  date: number;
  direction?: string;
  type: string;
  source: 'manual' | 'nightscout';
};

type Settings = {
  nightscoutUrl: string;
  lowGlucose: number;
  highGlucose: number;
};

type PatternAnalysis = {
  overallTimeInRange: number;
  timeAboveRange: number;
  timeBelowRange: number;
  averageGlucose: number;
  glucoseVariability: number;
  timePatterns: {
    overnight: { average: number; timeInRange: number; readings: number };
    morning: { average: number; timeInRange: number; readings: number };
    afternoon: { average: number; timeInRange: number; readings: number };
    evening: { average: number; timeInRange: number; readings: number };
  };
  suggestions: string[];
  riskAssessment: {
    hypoRisk: 'low' | 'moderate' | 'high';
    hyperRisk: 'low' | 'moderate' | 'high';
    variabilityRisk: 'low' | 'moderate' | 'high';
  };
  recommendedSettings: {
    suggestedLowTarget?: number;
    suggestedHighTarget?: number;
    reasoning: string[];
  };
};

export default function AnalysisPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [settings, setSettings] = useState<Settings>({
    nightscoutUrl: '',
    lowGlucose: 70,
    highGlucose: 180,
  });
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null);
  const [analysisDateRange, setAnalysisDateRange] = useState(30); // days

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    if (session) {
      fetchSettings();
    }
  }, [session]);

  const fetchAndAnalyzeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch readings for the last N days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - analysisDateRange);

      const url = new URL('/api/readings', window.location.origin);
      url.searchParams.set('startDate', startDate.getTime().toString());
      url.searchParams.set('endDate', endDate.getTime().toString());
      url.searchParams.set('source', 'combined');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch readings');
      }

      const fetchedReadings = await response.json();
      
      // Transform to Reading type
      const transformedReadings: Reading[] = fetchedReadings.map((r: {sgv: number, date: string | number, direction?: string, source: string}) => ({
        sgv: r.sgv,
        date: new Date(r.date).getTime(),
        direction: r.direction,
        type: 'sgv',
        source: r.source as 'manual' | 'nightscout'
      }));

      setReadings(transformedReadings);
      
      if (transformedReadings.length > 0) {
        const analysisResult = analyzePatterns(transformedReadings, settings);
        setAnalysis(analysisResult);
      } else {
        setError('No readings found for analysis');
      }
    } catch (error) {
      setError('Failed to analyze patterns');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [analysisDateRange, settings]);

  useEffect(() => {
    if (session && settings) {
      fetchAndAnalyzeData();
    }
  }, [session, settings, analysisDateRange, fetchAndAnalyzeData]);

  const analyzePatterns = (readings: Reading[], settings: Settings): PatternAnalysis => {
    const { lowGlucose, highGlucose } = settings;
    
    // Basic statistics
    const totalReadings = readings.length;
    const averageGlucose = readings.reduce((sum, r) => sum + r.sgv, 0) / totalReadings;
    const variance = readings.reduce((sum, r) => sum + Math.pow(r.sgv - averageGlucose, 2), 0) / totalReadings;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = (standardDeviation / averageGlucose) * 100;

    // Time in range calculations
    const inRange = readings.filter(r => r.sgv >= lowGlucose && r.sgv <= highGlucose).length;
    const aboveRange = readings.filter(r => r.sgv > highGlucose).length;
    const belowRange = readings.filter(r => r.sgv < lowGlucose).length;

    const overallTimeInRange = (inRange / totalReadings) * 100;
    const timeAboveRange = (aboveRange / totalReadings) * 100;
    const timeBelowRange = (belowRange / totalReadings) * 100;

    // Time pattern analysis
    const timePatterns = {
      overnight: analyzeTimePeriod(readings, 0, 6, lowGlucose, highGlucose),
      morning: analyzeTimePeriod(readings, 6, 12, lowGlucose, highGlucose),
      afternoon: analyzeTimePeriod(readings, 12, 18, lowGlucose, highGlucose),
      evening: analyzeTimePeriod(readings, 18, 24, lowGlucose, highGlucose),
    };

    // Risk assessment
    const hypoRisk = timeBelowRange > 4 ? 'high' : timeBelowRange > 1 ? 'moderate' : 'low';
    const hyperRisk = timeAboveRange > 25 ? 'high' : timeAboveRange > 5 ? 'moderate' : 'low';
    const variabilityRisk = coefficientOfVariation > 36 ? 'high' : coefficientOfVariation > 33 ? 'moderate' : 'low';

    // Generate suggestions
    const suggestions = generateSuggestions({
      overallTimeInRange,
      timeBelowRange,
      timeAboveRange,
      variabilityRisk,
      coefficientOfVariation,
      timePatterns
    });

    // Recommended settings
    const recommendedSettings = generateSettingsRecommendations({
      currentSettings: settings,
      hypoRisk,
      overallTimeInRange,
      timeAboveRange,
    });

    return {
      overallTimeInRange: Math.round(overallTimeInRange),
      timeAboveRange: Math.round(timeAboveRange),
      timeBelowRange: Math.round(timeBelowRange),
      averageGlucose: Math.round(averageGlucose),
      glucoseVariability: Math.round(coefficientOfVariation),
      timePatterns,
      suggestions,
      riskAssessment: {
        hypoRisk,
        hyperRisk,
        variabilityRisk
      },
      recommendedSettings
    };
  };

  const analyzeTimePeriod = (readings: Reading[], startHour: number, endHour: number, lowTarget: number, highTarget: number) => {
    const periodReadings = readings.filter(r => {
      const hour = new Date(r.date).getHours();
      return hour >= startHour && hour < endHour;
    });

    if (periodReadings.length === 0) {
      return { average: 0, timeInRange: 0, readings: 0 };
    }

    const average = periodReadings.reduce((sum, r) => sum + r.sgv, 0) / periodReadings.length;
    const inRange = periodReadings.filter(r => r.sgv >= lowTarget && r.sgv <= highTarget).length;
    const timeInRange = (inRange / periodReadings.length) * 100;

    return {
      average: Math.round(average),
      timeInRange: Math.round(timeInRange),
      readings: periodReadings.length
    };
  };

  const generateSuggestions = (data: {
    overallTimeInRange: number;
    timeBelowRange: number;
    timeAboveRange: number;
    variabilityRisk: string;
    coefficientOfVariation: number;
    timePatterns: Record<string, {readings: number, timeInRange: number}>;
  }): string[] => {
    const suggestions: string[] = [];

    // Time in range suggestions
    if (data.overallTimeInRange < 70) {
      suggestions.push(`Your time in range is ${data.overallTimeInRange}%. Target goal is 70%+. Focus on reducing both highs and lows.`);
    } else if (data.overallTimeInRange >= 70 && data.overallTimeInRange < 80) {
      suggestions.push(`Good progress! Your time in range is ${data.overallTimeInRange}%. Aim for 80%+ for optimal control.`);
    } else {
      suggestions.push(`Excellent! Your time in range is ${data.overallTimeInRange}%. Maintain current management strategies.`);
    }

    // Hypoglycemia suggestions
    if (data.timeBelowRange > 4) {
      suggestions.push('High risk of hypoglycemia detected. Consider discussing with your healthcare provider about adjusting insulin or medication doses.');
    } else if (data.timeBelowRange > 1) {
      suggestions.push('Moderate hypoglycemia risk. Monitor for patterns and consider snacks before common low times.');
    }

    // Hyperglycemia suggestions
    if (data.timeAboveRange > 25) {
      suggestions.push('Frequent high glucose levels detected. Review carbohydrate counting, meal timing, and medication adherence.');
    } else if (data.timeAboveRange > 5) {
      suggestions.push('Some high glucose episodes detected. Focus on post-meal management and portion control.');
    }

    // Variability suggestions
    if (data.variabilityRisk === 'high') {
      suggestions.push('High glucose variability detected. Consider more frequent monitoring and consistent meal timing.');
    } else if (data.variabilityRisk === 'moderate') {
      suggestions.push('Moderate glucose variability. Focus on consistent carbohydrate intake and regular meal schedules.');
    }

    // Time-specific suggestions
    Object.entries(data.timePatterns).forEach(([period, stats]) => {
      if (stats.readings > 10 && stats.timeInRange < 60) {
        const periodName = period.charAt(0).toUpperCase() + period.slice(1);
        suggestions.push(`${periodName} period shows lower control (${stats.timeInRange}% TIR). Consider adjusting ${period} management strategies.`);
      }
    });

    return suggestions;
  };

  const generateSettingsRecommendations = (data: {
    currentSettings: Settings;
    hypoRisk: string;
    overallTimeInRange: number;
    timeAboveRange: number;
  }): PatternAnalysis['recommendedSettings'] => {
    const reasoning: string[] = [];
    let suggestedLowTarget = data.currentSettings.lowGlucose;
    let suggestedHighTarget = data.currentSettings.highGlucose;

    // Adjust targets based on hypoglycemia risk
    if (data.hypoRisk === 'high') {
      suggestedLowTarget = Math.max(70, data.currentSettings.lowGlucose + 10);
      reasoning.push('Increased low target due to high hypoglycemia risk');
    } else if (data.hypoRisk === 'moderate') {
      suggestedLowTarget = Math.max(70, data.currentSettings.lowGlucose + 5);
      reasoning.push('Slightly increased low target due to moderate hypoglycemia risk');
    }

    // Adjust targets based on overall control
    if (data.overallTimeInRange > 80 && data.hypoRisk === 'low') {
      suggestedHighTarget = Math.max(140, data.currentSettings.highGlucose - 10);
      reasoning.push('Tightened high target due to excellent overall control and low hypoglycemia risk');
    } else if (data.overallTimeInRange < 50) {
      suggestedHighTarget = Math.min(200, data.currentSettings.highGlucose + 10);
      reasoning.push('Relaxed high target to improve overall time in range');
    }

    // Only suggest changes if they're different from current settings
    if (suggestedLowTarget === data.currentSettings.lowGlucose && 
        suggestedHighTarget === data.currentSettings.highGlucose) {
      reasoning.push('Current target ranges are appropriate for your glucose patterns');
    }

    return {
      ...(suggestedLowTarget !== data.currentSettings.lowGlucose && { suggestedLowTarget }),
      ...(suggestedHighTarget !== data.currentSettings.highGlucose && { suggestedHighTarget }),
      reasoning
    };
  };

  const getRiskColor = (risk: 'low' | 'moderate' | 'high') => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Please sign in to view pattern analysis.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Analyzing Patterns...</h1>
          <p className="mt-2 text-gray-600">Processing your glucose data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Analysis Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={fetchAndAnalyzeData}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pattern Analysis & Recommendations</h1>
        <div className="flex items-center space-x-4">
          <select
            value={analysisDateRange}
            onChange={(e) => setAnalysisDateRange(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchAndAnalyzeData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Refresh Analysis
          </button>
        </div>
      </div>

      {analysis && (
        <div className="space-y-8">
          {/* Overview Stats */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Overview ({analysisDateRange} days, {readings.length} readings)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-green-600">{analysis.overallTimeInRange}%</p>
                <p className="text-sm text-gray-600">Time in Range</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-red-600">{analysis.timeAboveRange}%</p>
                <p className="text-sm text-gray-600">Above Range</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-orange-600">{analysis.timeBelowRange}%</p>
                <p className="text-sm text-gray-600">Below Range</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-blue-600">{analysis.glucoseVariability}%</p>
                <p className="text-sm text-gray-600">Variability (CV)</p>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Risk Assessment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded ${getRiskColor(analysis.riskAssessment.hypoRisk)}`}>
                <h3 className="font-semibold">Hypoglycemia Risk</h3>
                <p className="text-lg capitalize">{analysis.riskAssessment.hypoRisk}</p>
              </div>
              <div className={`p-4 rounded ${getRiskColor(analysis.riskAssessment.hyperRisk)}`}>
                <h3 className="font-semibold">Hyperglycemia Risk</h3>
                <p className="text-lg capitalize">{analysis.riskAssessment.hyperRisk}</p>
              </div>
              <div className={`p-4 rounded ${getRiskColor(analysis.riskAssessment.variabilityRisk)}`}>
                <h3 className="font-semibold">Variability Risk</h3>
                <p className="text-lg capitalize">{analysis.riskAssessment.variabilityRisk}</p>
              </div>
            </div>
          </div>

          {/* Time Patterns */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Daily Time Patterns</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analysis.timePatterns).map(([period, stats]) => (
                <div key={period} className="p-4 border rounded">
                  <h3 className="font-semibold capitalize">{period}</h3>
                  <p className="text-sm text-gray-600">{stats.readings} readings</p>
                  <div className="mt-2">
                    <p>Avg: {stats.average} mg/dL</p>
                    <p>TIR: {stats.timeInRange}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Settings */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Recommended Target Settings</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded">
                <div>
                  <h3 className="font-semibold">Current Targets</h3>
                  <p>{settings.lowGlucose} - {settings.highGlucose} mg/dL</p>
                </div>
                <div>
                  <h3 className="font-semibold">Recommended Targets</h3>
                  <p>
                    {analysis.recommendedSettings.suggestedLowTarget ?? settings.lowGlucose} - {analysis.recommendedSettings.suggestedHighTarget ?? settings.highGlucose} mg/dL
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Reasoning</h3>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.recommendedSettings.reasoning.map((reason, index) => (
                    <li key={index} className="text-gray-700">{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Personalized Suggestions</h2>
            <div className="space-y-3">
              {analysis.suggestions.map((suggestion, index) => (
                <div key={index} className="p-4 bg-blue-50 border-l-4 border-blue-400">
                  <p className="text-blue-800">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800">Important Disclaimer</h3>
            <p className="text-yellow-700 text-sm mt-2">
              This analysis is for informational purposes only and should not replace professional medical advice. 
              Always consult with your healthcare provider before making changes to your diabetes management plan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 