'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

export default function TherapyAdjustmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AdjustmentSuggestions | null>(null);
  const [analysisDateRange, setAnalysisDateRange] = useState(3);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchAdjustmentSuggestions = async () => {
    setLoading(true);
    setError(null);

    console.log('Fetching therapy adjustments with date range:', analysisDateRange);
    console.log('analysisDateRange type:', typeof analysisDateRange);
    console.log('analysisDateRange value:', analysisDateRange);

    try {
      const response = await fetch('/api/therapy-adjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisDateRange }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      
      console.log('Therapy adjustment API response:', data);
      console.log('Response data type:', typeof data);
      console.log('Response data keys:', Object.keys(data || {}));
      
      if (!response.ok) {
        // Handle API errors with detailed messages
        if (data.error && data.message) {
          setError(data.message);
        } else if (data.error) {
          setError(data.error);
        } else {
          setError(`HTTP ${response.status}: ${response.statusText}`);
        }
        setSuggestions(null);
        return;
      }
      
      // Check if the response has the expected structure
      if (data.error) {
        setError(data.message || data.error);
        setSuggestions(null);
      } else if (data && typeof data === 'object') {
        // Validate that we have the expected structure
        const hasRequiredFields = data.basalAdjustments !== undefined && 
                                data.carbRatioAdjustments !== undefined && 
                                data.sensitivityAdjustments !== undefined && 
                                data.targetAdjustments !== undefined;
        
        if (hasRequiredFields) {
          setSuggestions(data);
          console.log('Suggestions set:', data);
        } else {
          console.error('Invalid response structure:', data);
          setError('Invalid response format from server. Please try again.');
          setSuggestions(null);
        }
      } else {
        console.error('Unexpected response format:', data);
        setError('Unexpected response format from server. Please try again.');
        setSuggestions(null);
      }
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof Error) {
        setError(`Failed to analyze therapy adjustments: ${error.message}`);
      } else {
        setError('Failed to analyze therapy adjustments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchAdjustmentSuggestions();
    }
  }, [session, analysisDateRange]);

  // Debug: Monitor analysisDateRange changes
  useEffect(() => {
    console.log('analysisDateRange changed to:', analysisDateRange);
  }, [analysisDateRange]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-700';
      case 'medium': return 'text-yellow-700';
      case 'low': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  const getDataQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatAdjustmentType = (type: string) => {
    switch (type) {
      case 'basal': return 'Basal Rate';
      case 'carbratio': return 'Carb Ratio';
      case 'sens': return 'Insulin Sensitivity';
      case 'target': return 'Target Range';
      default: return type;
    }
  };

  const renderAdjustmentCard = (adjustment: TherapyAdjustment) => (
    <div key={`${adjustment.type}-${adjustment.timeSlot}`} 
         className={`p-4 border rounded-lg ${getPriorityColor(adjustment.priority)}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold">{formatAdjustmentType(adjustment.type)} - {adjustment.timeSlot}</h4>
          <div className="text-sm mt-1">
            <span className="font-medium">Current:</span> {adjustment.currentValue} →{' '}
            <span className="font-medium">Suggested:</span> {adjustment.suggestedValue}
            {adjustment.adjustmentPercentage !== 0 && (
              <span className={`ml-2 ${adjustment.adjustmentPercentage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ({adjustment.adjustmentPercentage > 0 ? '+' : ''}{adjustment.adjustmentPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-xs">
          <div className={`font-medium ${getConfidenceColor(adjustment.confidence)}`}>
            {adjustment.confidence.toUpperCase()} confidence
          </div>
          <div className="text-gray-600 mt-1">
            {adjustment.priority.toUpperCase()} priority
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-700">{adjustment.reasoning}</p>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Therapy Dose Adjustments</h1>
              <p className="text-gray-600 mt-2">
                AI-powered suggestions based on recent glucose patterns (1 day to 1 week) and current therapy settings
              </p>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex">
                  <div className="text-amber-400 text-lg">⚠️</div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-amber-800">
                      <strong>Important:</strong> Adjusting therapy using data more than 1 week old is not recommended. 
                      Use recent data for the most accurate and safe recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Analysis Period
                </label>
                <select
                  value={analysisDateRange}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    console.log('Dropdown changed from', analysisDateRange, 'to', newValue);
                    setAnalysisDateRange(newValue);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>1 week</option>
                </select>
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Adjusting therapy using data more than 1 week old is not recommended
                </p>
              </div>
              <button
                onClick={fetchAdjustmentSuggestions}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Refresh Analysis'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="text-red-400">⚠️</div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  
                  {/* Provide helpful guidance based on error type */}
                  {error.includes('diabetes profile') && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Next Steps:</strong> Go to{' '}
                        <a href="/diabetes-profile" className="text-blue-600 hover:text-blue-800 underline">
                          Diabetes Profile
                        </a>{' '}
                        to set up your basal rates, carb ratios, insulin sensitivity, and target ranges.
                      </p>
                    </div>
                  )}
                  
                  {error.includes('glucose data') && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Next Steps:</strong> Go to{' '}
                        <a href="/readings" className="text-blue-600 hover:text-blue-800 underline">
                          Blood Glucose Data
                        </a>{' '}
                        to add manual readings or sync from Nightscout.
                      </p>
                    </div>
                  )}
                  
                  {error.includes('Insufficient data') && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Next Steps:</strong> Try a shorter analysis period (1-3 days) or add more glucose readings.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
            <div className="text-sm text-gray-600">
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>Analysis Date Range:</strong> {analysisDateRange} days</p>
              <p><strong>Has Suggestions:</strong> {suggestions ? 'Yes' : 'No'}</p>
              <p><strong>Suggestions Type:</strong> {suggestions ? typeof suggestions : 'N/A'}</p>
              {suggestions && (
                <>
                  <p><strong>Basal Adjustments:</strong> {suggestions.basalAdjustments?.length || 0}</p>
                  <p><strong>Carb Ratio Adjustments:</strong> {suggestions.carbRatioAdjustments?.length || 0}</p>
                  <p><strong>Sensitivity Adjustments:</strong> {suggestions.sensitivityAdjustments?.length || 0}</p>
                  <p><strong>Target Adjustments:</strong> {suggestions.targetAdjustments?.length || 0}</p>
                  <p><strong>Overall Recommendations:</strong> {suggestions.overallRecommendations?.length || 0}</p>
                  <p><strong>Safety Warnings:</strong> {suggestions.safetyWarnings?.length || 0}</p>
                </>
              )}
            </div>
          </div>

          {suggestions ? (
            <>
              {/* Analysis Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {suggestions.analysisMetrics.timeInRange}%
                  </div>
                  <div className="text-sm text-gray-600">Time in Range</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {suggestions.analysisMetrics.timeAboveRange}%
                  </div>
                  <div className="text-sm text-gray-600">Time Above</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {suggestions.analysisMetrics.timeBelowRange}%
                  </div>
                  <div className="text-sm text-gray-600">Time Below</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {suggestions.analysisMetrics.averageGlucose}
                  </div>
                  <div className="text-sm text-gray-600">Avg Glucose</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {suggestions.analysisMetrics.glucoseVariability}%
                  </div>
                  <div className="text-sm text-gray-600">Variability</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className={`text-2xl font-bold ${getDataQualityColor(suggestions.analysisMetrics.dataQuality)}`}>
                    {suggestions.analysisMetrics.dataQuality.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600">Data Quality</div>
                </div>
              </div>

              {/* Safety Warnings */}
              {suggestions.safetyWarnings.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">⚠️ Safety Warnings</h2>
                  <div className="space-y-3">
                    {suggestions.safetyWarnings.map((warning, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-md p-4">
                        <p className="text-red-800">{warning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Recommendations */}
              {suggestions.overallRecommendations.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Overall Recommendations</h2>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <ul className="space-y-2">
                      {suggestions.overallRecommendations.map((rec, index) => (
                        <li key={index} className="text-blue-800 flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Basal Adjustments */}
              {suggestions.basalAdjustments.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">🕐 Basal Rate Adjustments</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestions.basalAdjustments.map(renderAdjustmentCard)}
                  </div>
                </div>
              )}

              {/* Carb Ratio Adjustments */}
              {suggestions.carbRatioAdjustments.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">🍽️ Carb Ratio Adjustments</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestions.carbRatioAdjustments.map(renderAdjustmentCard)}
                  </div>
                </div>
              )}

              {/* Sensitivity Adjustments */}
              {suggestions.sensitivityAdjustments.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">💉 Insulin Sensitivity Adjustments</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestions.sensitivityAdjustments.map(renderAdjustmentCard)}
                  </div>
                </div>
              )}

              {/* Target Adjustments */}
              {suggestions.targetAdjustments.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Target Range Adjustments</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestions.targetAdjustments.map(renderAdjustmentCard)}
                  </div>
                </div>
              )}

              {/* No Adjustments Message */}
              {suggestions.basalAdjustments.length === 0 && 
               suggestions.carbRatioAdjustments.length === 0 && 
               suggestions.sensitivityAdjustments.length === 0 && 
               suggestions.targetAdjustments.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Adjustments Needed
                  </h3>
                  <p className="text-gray-600">
                    Your current therapy settings appear to be working well based on recent glucose patterns.
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-yellow-400">⚠️</div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Important Disclaimer</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      These suggestions are for educational purposes only and should not replace professional medical advice. 
                      Always consult with your healthcare provider before making any changes to your diabetes therapy. 
                      Make only one adjustment at a time and monitor carefully for 3-5 days before making additional changes.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Analyze
              </h3>
              <p className="text-gray-600">
                Click "Refresh Analysis" to generate therapy adjustment suggestions based on your recent glucose data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 