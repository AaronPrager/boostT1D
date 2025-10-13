'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';

type InsulinRecommendation = {
  carb_bolus_units: number;
  correction_units: number;
  total_units: number;
  safe_bolus: number;
  current_iob: number;
  current_cob: number;
  iob_reduction: number;
  carb_ratio: number;
  carb_ratio_time: string;
  current_glucose?: number;
  insulin_sensitivity?: number;
  target_glucose?: number;
  calculation_note: string;
  warning?: string;
  safety_warnings: string[];
  iob_breakdown?: Array<{
    treatmentId: string;
    originalDose: number;
    remainingIOB: number;
    timeSinceDose: number;
    percentageRemaining: number;
  }>;
  cob_breakdown?: Array<{
    treatmentId: string;
    originalCarbs: number;
    remainingCOB: number;
    timeSinceDose: number;
    percentageRemaining: number;
    needsInsulin: boolean;
  }>;
};

type FoodAnalysis = {
  description: string;
  carbs_grams: number;
  confidence: string;
  notes: string;
  insulin_recommendation?: InsulinRecommendation | null;
};

export default function FoodAnalysisPage() {
  const { data: session, status } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCalculationPopup, setShowCalculationPopup] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Create a synthetic file input element and call handleFileSelect directly with the file
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    setAnalysis(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const analyzeFood = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile); // Changed from 'image' to 'photo' to match API

      const response = await fetch('/api/food-analysis', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Analysis failed';
        console.error('Food analysis API error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        try {
          const errorData = await response.json();
          console.error('Error response data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response as JSON:', parseError);
          // If response is not JSON, use status text or default message
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Analysis error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to analyze food. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setError('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">🍎 Carb Estimator</h2>
              {!session && (
                <div className="text-sm text-gray-600">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Guest Mode - Carb estimates only
                  </span>
                </div>
              )}
            </div>
            
            {!session && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Get More Features with an Account
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Currently you can get carbohydrate estimates. Sign in or create an account to get:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Personalized insulin recommendations</li>
                        <li>Save your meal history</li>
                        <li>Track patterns over time</li>
                        <li>Integrate with Nightscout</li>
                      </ul>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => signIn()}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Sign In / Create Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <p className="text-gray-600 mb-6">Upload a photo of your food to get an AI-powered estimate of carbohydrates and personalized insulin recommendations based on your pump settings.</p>

            <div className="space-y-6">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Food Photo
                </label>
                
                <div
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="space-y-1 text-center">
                    {previewUrl ? (
                      <div className="space-y-4">
                        <Image
                          src={previewUrl}
                          alt="Food preview"
                          width={128}
                          height={128}
                          className="mx-auto h-32 w-auto rounded-lg shadow-sm"
                        />
                        <div className="flex space-x-2 justify-center">
                          <button
                            onClick={clearSelection}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis Button */}
              {selectedFile && (
                <div>
                  <button
                    onClick={analyzeFood}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      'Analyze Food for Carbs & Insulin'
                    )}
                  </button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {analysis && (
                <div className="space-y-4">
                  {/* Carb Analysis Results */}
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">🍎 Food Analysis Results</h3>
                        <div className="mt-2 text-sm text-green-700 space-y-1">
                          <p><strong>Description:</strong> {analysis.description}</p>
                          <p><strong>Estimated Carbs:</strong> <span className="text-lg font-bold">{analysis.carbs_grams}g</span></p>
                          <p><strong>Confidence:</strong> {analysis.confidence}</p>
                          <p><strong>Notes:</strong> {analysis.notes}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Insulin Recommendation - Only show for logged-in users */}
                  {session && analysis.insulin_recommendation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 w-full">
                          <h3 className="text-sm font-medium text-blue-800">💉 Insulin Recommendation</h3>
                          <div className="mt-2 text-sm text-blue-700 space-y-2">
                            
                            {/* Main Bolus Recommendation */}
                            <div className="bg-blue-100 rounded-lg p-3 border">
                              <div className="flex items-center">
                                <p className="text-lg font-bold text-blue-900">
                                  Safe Bolus: <span className="text-xl">{analysis.insulin_recommendation.safe_bolus}u</span>
                                </p>
                                <button
                                  onClick={() => setShowCalculationPopup(true)}
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 transition-all duration-200 px-3 py-1.5 ml-3 rounded-lg border border-blue-300 hover:border-blue-400 shadow-sm hover:shadow-md flex items-center space-x-1 text-sm font-medium transform hover:scale-105 active:scale-95"
                                  title="View detailed calculation"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Details</span>
                                </button>
                              </div>
                            </div>

                            {/* Breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div className="bg-white rounded p-2 border border-blue-200">
                                <p className="font-medium">Carb Bolus</p>
                                <p className="text-lg font-bold text-blue-900">{analysis.insulin_recommendation.carb_bolus_units}u</p>
                                <p className="text-blue-600">For {analysis.carbs_grams}g carbs</p>
                              </div>
                              
                              {analysis.insulin_recommendation.correction_units > 0 && (
                                <div className="bg-white rounded p-2 border border-blue-200">
                                  <p className="font-medium">Correction</p>
                                  <p className="text-lg font-bold text-blue-900">{analysis.insulin_recommendation.correction_units}u</p>
                                  <p className="text-blue-600">For high glucose</p>
                                </div>
                              )}
                              
                              <div className="bg-white rounded p-2 border border-orange-200">
                                <p className="font-medium">Current IOB</p>
                                <p className="text-lg font-bold text-orange-900">{analysis.insulin_recommendation.current_iob}u</p>
                                <p className="text-orange-600">Active insulin</p>
                              </div>
                              
                              <div className="bg-white rounded p-2 border border-green-200">
                                <p className="font-medium">Current COB</p>
                                <p className="text-lg font-bold text-green-900">{analysis.insulin_recommendation.current_cob}g</p>
                                <p className="text-green-600">Active carbs</p>
                              </div>
                            </div>

                            {/* Settings Used */}
                            <div className="text-xs text-blue-600 border-t border-blue-200 pt-2">
                              <p><strong>Carb Ratio:</strong> 1:{analysis.insulin_recommendation.carb_ratio} (active at {analysis.insulin_recommendation.carb_ratio_time})</p>
                              {analysis.insulin_recommendation.insulin_sensitivity && (
                                <p><strong>Correction Factor:</strong> 1:{analysis.insulin_recommendation.insulin_sensitivity} mg/dL</p>
                              )}
                              {analysis.insulin_recommendation.target_glucose && (
                                <p><strong>Target Glucose:</strong> {analysis.insulin_recommendation.target_glucose} mg/dL</p>
                              )}
                              {analysis.insulin_recommendation.current_glucose && (
                                <p><strong>Current Glucose:</strong> {analysis.insulin_recommendation.current_glucose} mg/dL</p>
                              )}
                            </div>

                            {/* IOB Breakdown */}
                            {analysis.insulin_recommendation.iob_breakdown && analysis.insulin_recommendation.iob_breakdown.length > 0 && (
                              <div className="mt-3 bg-gray-50 rounded p-3 border border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-2">📊 IOB Breakdown:</p>
                                <div className="space-y-1">
                                  {analysis.insulin_recommendation.iob_breakdown.map((dose, index) => (
                                    <div key={index} className="text-xs text-gray-600 flex justify-between">
                                      <span>{dose.originalDose}u ({dose.timeSinceDose.toFixed(1)}h ago)</span>
                                      <span className="font-medium">{dose.remainingIOB.toFixed(1)}u remaining</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* COB Breakdown */}
                            {analysis.insulin_recommendation.cob_breakdown && analysis.insulin_recommendation.cob_breakdown.length > 0 && (
                              <div className="mt-3 bg-green-50 rounded p-3 border border-green-200">
                                <p className="text-xs font-medium text-green-700 mb-2">🍎 COB Breakdown:</p>
                                <div className="space-y-1">
                                  {analysis.insulin_recommendation.cob_breakdown.map((dose, index) => (
                                    <div key={index} className="text-xs text-green-600 flex justify-between">
                                      <span>{dose.originalCarbs}g ({dose.timeSinceDose.toFixed(1)}h ago)</span>
                                      <span className="font-medium">{dose.remainingCOB.toFixed(1)}g remaining</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Safety Warnings */}
                            {analysis.insulin_recommendation.safety_warnings && analysis.insulin_recommendation.safety_warnings.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {analysis.insulin_recommendation.safety_warnings.map((warning, index) => (
                                  <div key={index} className="bg-yellow-100 border border-yellow-300 rounded p-2">
                                    <div className="flex">
                                      <svg className="h-4 w-4 text-yellow-400 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1">
                                        <p className="text-xs text-yellow-800">{warning}</p>
                                        {warning.includes('Nightscout') && (
                                          <Link href="/diabetes-profile" className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block">
                                            🔧 Check Diabetes Profile Settings
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Warning */}
                            {analysis.insulin_recommendation.warning && (
                              <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-2">
                                <div className="flex">
                                  <svg className="h-4 w-4 text-yellow-400 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <p className="text-xs text-yellow-800">{analysis.insulin_recommendation.warning}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sign in prompt for non-logged-in users */}
                  {!session && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-indigo-800">💉 Want Insulin Recommendations?</h4>
                          <p className="text-sm text-indigo-700 mt-1">
                            Sign in to get personalized insulin dose calculations based on your carb ratios and current glucose levels.
                          </p>
                          <div className="mt-3">
                            <button
                              onClick={() => signIn()}
                              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                            >
                              Sign In for Insulin Recommendations
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No Insulin Data Warning - Only for logged-in users */}
                  {session && !analysis.insulin_recommendation && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-yellow-800">Insulin Calculation Unavailable</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            To get insulin recommendations, ensure your Nightscout profile is configured with carb ratios and insulin sensitivity factors.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Details Popup */}
      {showCalculationPopup && analysis?.insulin_recommendation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Detailed Insulin Calculation</h2>
              <button
                onClick={() => setShowCalculationPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Final Recommendation</h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {analysis.insulin_recommendation.safe_bolus}u
                  </p>
                  <p className="text-blue-700">Safe Bolus</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Calculation Breakdown</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-line font-mono">
                    {analysis.insulin_recommendation.calculation_note}
                  </div>
                </div>

                {analysis.insulin_recommendation.safety_warnings && analysis.insulin_recommendation.safety_warnings.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Safety Warnings</h4>
                    <ul className="space-y-1">
                      {analysis.insulin_recommendation.safety_warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-800">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Settings Used</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Carb Ratio:</strong> 1:{analysis.insulin_recommendation.carb_ratio} (active at {analysis.insulin_recommendation.carb_ratio_time})</p>
                    {analysis.insulin_recommendation.insulin_sensitivity && (
                      <p><strong>Correction Factor:</strong> 1:{analysis.insulin_recommendation.insulin_sensitivity} mg/dL</p>
                    )}
                    {analysis.insulin_recommendation.target_glucose && (
                      <p><strong>Target Glucose:</strong> {analysis.insulin_recommendation.target_glucose} mg/dL</p>
                    )}
                    {analysis.insulin_recommendation.current_glucose && (
                      <p><strong>Current Glucose:</strong> {analysis.insulin_recommendation.current_glucose} mg/dL</p>
                    )}
                    <p><strong>Current IOB:</strong> {analysis.insulin_recommendation.current_iob}u</p>
                    <p><strong>Current COB:</strong> {analysis.insulin_recommendation.current_cob}g</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCalculationPopup(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
