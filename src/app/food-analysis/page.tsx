'use client';

import React, { useState } from 'react';
import Image from 'next/image';

type InsulinRecommendation = {
  carb_bolus_units: number;
  correction_units: number;
  total_units: number;
  carb_ratio: number;
  carb_ratio_time: string;
  current_glucose?: number;
  calculation_note: string;
  warning?: string;
};

type FoodAnalysis = {
  description: string;
  carbs_grams: number;
  confidence: string;
  notes: string;
  insulin_recommendation?: InsulinRecommendation | null;
};

export default function FoodAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      formData.append('image', selectedFile);

      const response = await fetch('/api/food-analysis', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch {
      setError('Failed to analyze image');
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🍎 Food Analysis & Insulin Calculator</h2>
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

                  {/* Insulin Recommendation */}
                  {analysis.insulin_recommendation && (
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
                              <p className="text-lg font-bold text-blue-900">
                                Recommended Bolus: <span className="text-xl">{analysis.insulin_recommendation.total_units}u</span>
                              </p>
                              <p className="text-xs text-blue-600 mt-1">{analysis.insulin_recommendation.calculation_note}</p>
                            </div>

                            {/* Breakdown */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
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
                            </div>

                            {/* Settings Used */}
                            <div className="text-xs text-blue-600 border-t border-blue-200 pt-2">
                              <p><strong>Carb Ratio:</strong> 1:{analysis.insulin_recommendation.carb_ratio} (active at {analysis.insulin_recommendation.carb_ratio_time})</p>
                              {analysis.insulin_recommendation.current_glucose && (
                                <p><strong>Current Glucose:</strong> {analysis.insulin_recommendation.current_glucose} mg/dL</p>
                              )}
                            </div>

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

                  {/* No Insulin Data Warning */}
                  {!analysis.insulin_recommendation && (
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
    </div>
  );
}
