'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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

export default function AnalysisPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AdjustmentSuggestions | null>(null);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchAdjustmentSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const analysisDateRange = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24));
      
      const response = await fetch('/api/therapy-adjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisDateRange }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.error === 'DIABETES_PROFILE_NOT_SETUP') {
          setError('Please set up your diabetes profile first before analyzing therapy adjustments. Go to Diabetes Profile to configure your settings.');
        } else {
          throw new Error('Failed to fetch therapy adjustments');
        }
        return;
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.message || data.error);
        setSuggestions(null);
      } else {
        setSuggestions(data);
      }
    } catch (error) {
      setError('Failed to analyze therapy adjustments');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  const renderAdjustmentCard = (adjustment: TherapyAdjustment, index: number) => (
    <div key={`${adjustment.type}-${adjustment.timeSlot}-${index}`} 
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
          <div className="font-medium">
            {adjustment.priority.toUpperCase()} priority
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-700">{adjustment.reasoning}</p>
    </div>
  );

  useEffect(() => {
    if (session) {
      fetchAdjustmentSuggestions();
    }
  }, [session, fromDate, toDate]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Please sign in</h1>
          <p className="mt-2 text-gray-600">You need to be signed in to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          <p className="mt-2 text-gray-600">Analyzing your therapy adjustments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Therapy Dose Adjustments</h1>
              <p className="text-gray-600 mt-2">
                AI-powered suggestions based on your glucose patterns and current therapy settings
              </p>
            </div>
        <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Analysis Period
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <span className="flex items-center text-gray-500">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
      </div>
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
                  {error.includes('diabetes profile') && (
                    <a 
                      href="/diabetes-profile" 
                      className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Go to Diabetes Profile
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Mode Section - Show when diabetes profile is not set up */}
          {error && error.includes('diabetes profile') && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-blue-900 font-semibold text-lg mb-2">Manual Mode Active 📊</h3>
                  <p className="text-blue-800 mb-3">
                    You're currently in manual mode. To get AI-powered therapy adjustment suggestions, you need to set up your diabetes profile with your current therapy settings.
                  </p>
                  <div className="bg-blue-100 rounded-lg p-4 mb-3">
                    <h4 className="text-blue-900 font-medium mb-2">To enable therapy analysis:</h4>
                    <ul className="text-blue-800 text-sm space-y-1">
                      <li>• <strong>Configure your diabetes profile</strong> with current basal rates, carb ratios, and sensitivity factors</li>
                      <li>• <strong>Set up Nightscout</strong> for automatic real-time data sync (optional)</li>
                      <li>• <strong>Add glucose readings</strong> manually or via Nightscout</li>
                      <li>• <strong>Get AI-powered suggestions</strong> for therapy adjustments</li>
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a 
                      href="/diabetes-profile" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configure Diabetes Profile
                    </a>
                    <a 
                      href="https://nightscout.github.io/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md border border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Learn About Nightscout
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {suggestions && (
            <>
              {/* Analysis Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
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
                    {((suggestions.analysisMetrics.averageGlucose + 46.7) / 28.7).toFixed(1)}%
          </div>
                  <div className="text-sm text-gray-600">Est. A1C</div>
                </div>
              </div>

              {/* Important Disclaimer */}
              <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-yellow-400">⚠️</div>
                  <div className="ml-3">
                    <h2 className="text-xl font-semibold text-yellow-800 mb-2">Important Disclaimer</h2>
                    <p className="text-yellow-700">
                      These suggestions are for educational purposes only and should not replace professional medical advice. 
                      Always consult with your healthcare provider before making any changes to your diabetes therapy. 
                      Make only one adjustment at a time and monitor carefully for 3-5 days before making additional changes.
                    </p>
                  </div>
                </div>
              </div>

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
                    {suggestions.basalAdjustments.map((adjustment, index) => renderAdjustmentCard(adjustment, index))}
                  </div>
                </div>
              )}

              {/* Carb Ratio Adjustments */}
              {suggestions.carbRatioAdjustments.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">🍽️ Carb Ratio Adjustments</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestions.carbRatioAdjustments.map((adjustment, index) => renderAdjustmentCard(adjustment, index))}
            </div>
          </div>
              )}

              {/* Sensitivity Adjustments */}
              {suggestions.sensitivityAdjustments.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">💉 Insulin Sensitivity Adjustments</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestions.sensitivityAdjustments.map((adjustment, index) => renderAdjustmentCard(adjustment, index))}
                  </div>
                </div>
              )}

              {/* Target Adjustments */}
              {suggestions.targetAdjustments.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Target Range Adjustments</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestions.targetAdjustments.map((adjustment, index) => renderAdjustmentCard(adjustment, index))}
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


            </>
          )}
        </div>
      </div>
    </div>
  );
} 