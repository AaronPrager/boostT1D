'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  const [analysisDateRange, setAnalysisDateRange] = useState(3);
  const [settings, setSettings] = useState<{ nightscoutUrl: string }>({ nightscoutUrl: '' });

  // Fetch settings to check if manual mode
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
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

  const fetchAdjustmentSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
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
        } else if (errorData.error && errorData.message) {
          setError(errorData.message);
        } else if (errorData.error) {
          setError(errorData.error);
        } else {
          setError(`HTTP ${response.status}: ${response.statusText}`);
        }
        setSuggestions(null);
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

  const handleSyncData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call the Nightscout sync API
      const response = await fetch('/api/nightscout/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to sync data from Nightscout. Please check your Nightscout configuration.');
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        // Clear any existing error and refresh the analysis
        setError(null);
        await fetchAdjustmentSuggestions();
      } else {
        setError(result.message || 'Failed to sync data from Nightscout.');
      }
    } catch (error) {
      console.error('Error syncing data:', error);
      setError('Failed to sync data from Nightscout. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
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

  // Auto-fetch when page loads with default 3-day analysis
  useEffect(() => {
    if (session) {
      fetchAdjustmentSuggestions();
    }
  }, [session]);

  // Fetch when analysis date range changes
  useEffect(() => {
    if (session && analysisDateRange) {
      fetchAdjustmentSuggestions();
    }
  }, [analysisDateRange]);

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
        {/* Manual Mode Indicator Banner */}
        {!settings.nightscoutUrl && (
          <div className="mb-6 bg-gradient-to-r from-orange-100 via-amber-50 to-yellow-100 border-2 border-orange-300 rounded-xl shadow-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-orange-900">Manual Mode Active</h3>
                <div className="mt-2 text-sm text-orange-800">
                  <p>You&apos;re using manual data entry. Therapy adjustment analysis requires at least 24 glucose readings per day for accurate suggestions. To enable automatic syncing with your CGM/pump, configure Nightscout in your <Link href="/personal-profile" className="font-semibold underline hover:text-orange-900">Personal Profile</Link>.</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link 
                    href="/readings" 
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-md"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Readings
                  </Link>
                  <Link 
                    href="/personal-profile" 
                    className="inline-flex items-center px-4 py-2 bg-white text-orange-700 border-2 border-orange-300 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configure Nightscout
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <select
                  value={analysisDateRange}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);

                    setAnalysisDateRange(newValue);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>1 week</option>
                </select>

              </div>
              <button
                onClick={fetchAdjustmentSuggestions}
                disabled={loading}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Refresh Analysis'}
              </button>
            </div>
          </div>

          {/* Error Messages - Show specific errors based on API response */}
          {error && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-gray-600 mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-semibold text-lg mb-2">
                    {error.includes('No glucose data available') ? 'No Data Available 📊' : 
                     error.includes('Insufficient data') ? 'Insufficient Data 📊' : 
                     error.includes('diabetes profile') ? 'Profile Setup Required 📊' :
                     'Analysis Error'}
                  </h3>
                  <p className="text-gray-700 mb-3">
                    {error}
                  </p>
                  
                  {/* Show general help for analysis errors */}
                  {!error.includes('No glucose data available') && !error.includes('Insufficient data') && !error.includes('diabetes profile') && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <h4 className="text-gray-900 font-medium mb-2">To resolve this issue:</h4>
                      <ul className="text-gray-700 text-sm space-y-1 mb-3">
                        <li>• <strong>Set up your diabetes profile</strong> with basal rates, carb ratios, and sensitivity factors</li>
                        <li>• <strong>Add glucose readings</strong> manually or sync from Nightscout</li>
                        <li>• <strong>Configure Nightscout</strong> for automatic data sync</li>
                        <li>• <strong>Ensure you have enough data</strong> - at least 24 readings per day</li>
                      </ul>
                      <div className="flex flex-wrap gap-3">
                        <a 
                          href="/diabetes-profile" 
                          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Set Up Diabetes Profile
                        </a>
                        <a 
                          href="/readings" 
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Add BG Data
                        </a>
                        <a 
                          href="/personal-profile" 
                          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Configure Nightscout
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Show sync button for data-related errors */}
                  {(error.includes('No glucose data available') || error.includes('Insufficient data')) && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-3">
                      <h4 className="text-blue-900 font-medium mb-2">To get started:</h4>
                      <ul className="text-blue-800 text-sm space-y-1 mb-3">
                        <li>• <strong>Sync from Nightscout</strong> to automatically download your glucose data</li>
                        <li>• <strong>Add manual readings</strong> if you don't use Nightscout</li>
                        <li>• <strong>Wait for data collection</strong> - we need at least 24 readings per day</li>
                      </ul>
                      <div className="flex flex-wrap gap-3">
                        <button 
                          onClick={handleSyncData}
                          disabled={loading}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {loading ? 'Syncing...' : 'Sync from Nightscout'}
                        </button>
                        <a 
                          href="/readings" 
                          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Manual Readings
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Show profile setup for diabetes profile errors */}
                  {error.includes('diabetes profile') && (
                    <div className="bg-orange-50 rounded-lg p-4 mb-3">
                      <h4 className="text-orange-900 font-medium mb-2">To enable therapy analysis:</h4>
                      <ul className="text-orange-800 text-sm space-y-1 mb-3">
                        <li>• <strong>Configure your diabetes profile</strong> with current basal rates, carb ratios, and sensitivity factors</li>
                        <li>• <strong>Set up Nightscout</strong> for automatic real-time data sync (optional)</li>
                        <li>• <strong>Add glucose readings</strong> manually or via Nightscout</li>
                        <li>• <strong>Get AI-powered suggestions</strong> for therapy adjustments</li>
                      </ul>
                      <div className="flex flex-wrap gap-3">
                        <a 
                          href="/diabetes-profile" 
                          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Configure Diabetes Profile
                        </a>
                        <a 
                          href="/personal-profile" 
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Configure Nightscout
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {suggestions && (
            <>
              {/* Analysis Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-700">
                    {suggestions.analysisMetrics.timeInRange}%
                  </div>
                  <div className="text-sm text-gray-600">Time in Range</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                  <div className="text-2xl font-bold text-red-700">
                    {suggestions.analysisMetrics.timeAboveRange}%
                  </div>
                  <div className="text-sm text-gray-600">Time Above</div>
          </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">
                    {suggestions.analysisMetrics.timeBelowRange}%
                  </div>
                  <div className="text-sm text-gray-600">Time Below</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">
                    {suggestions.analysisMetrics.averageGlucose}
                  </div>
                  <div className="text-sm text-gray-600">Avg Glucose</div>
            </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700">
                    {((suggestions.analysisMetrics.averageGlucose + 46.7) / 28.7).toFixed(1)}%
          </div>
                  <div className="text-sm text-gray-600">Est. A1C</div>
                </div>
              </div>

              {/* Important Disclaimer */}
              <div className="mb-8 bg-gray-50 border border-gray-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-gray-500">⚠️</div>
                  <div className="ml-3">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Important Disclaimer</h2>
                    <p className="text-gray-600">
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
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <ul className="space-y-2">
                      {suggestions.overallRecommendations.map((rec, index) => (
                        <li key={index} className="text-gray-700 flex items-start">
                          <span className="text-gray-500 mr-2">•</span>
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