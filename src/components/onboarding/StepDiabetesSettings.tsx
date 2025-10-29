'use client';

import React, { useState } from 'react';

interface Step3DiabetesSettingsProps {
  onNext: (data: {
    isManualMode: boolean;
    nightscoutUrl?: string;
    nightscoutApiToken?: string;
    lowGlucose: number;
    highGlucose: number;
  }) => void;
  onBack: () => void;
  initialData?: {
    isManualMode?: boolean;
    nightscoutUrl?: string;
    nightscoutApiToken?: string;
    lowGlucose?: number;
    highGlucose?: number;
  };
}

export default function Step3DiabetesSettings({ onNext, onBack, initialData }: Step3DiabetesSettingsProps) {
  const [formData, setFormData] = useState({
    isManualMode: initialData?.isManualMode ?? false,
    nightscoutUrl: initialData?.nightscoutUrl || '',
    nightscoutApiToken: initialData?.nightscoutApiToken || '',
    lowGlucose: initialData?.lowGlucose?.toString() || '70',
    highGlucose: initialData?.highGlucose?.toString() || '180'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showApiToken, setShowApiToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // If not manual mode, validate Nightscout credentials
    if (!formData.isManualMode) {
      if (!formData.nightscoutUrl.trim()) {
        newErrors.nightscoutUrl = 'Nightscout URL is required';
      } else if (!formData.nightscoutUrl.startsWith('http://') && !formData.nightscoutUrl.startsWith('https://')) {
        newErrors.nightscoutUrl = 'URL must start with http:// or https://';
      }

      if (!formData.nightscoutApiToken.trim()) {
        newErrors.nightscoutApiToken = 'API token is required';
      }
    }

    // Validate glucose range
    const low = parseInt(formData.lowGlucose);
    const high = parseInt(formData.highGlucose);

    if (isNaN(low) || low < 60 || low > 110) {
      newErrors.lowGlucose = 'Low glucose must be between 60-110 mg/dL';
    }

    if (isNaN(high) || high < 110 || high > 200) {
      newErrors.highGlucose = 'High glucose must be between 110-200 mg/dL';
    }

    if (!isNaN(low) && !isNaN(high) && low >= high) {
      newErrors.lowGlucose = 'Low must be less than high';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext({
        isManualMode: formData.isManualMode,
        nightscoutUrl: formData.isManualMode ? undefined : formData.nightscoutUrl,
        nightscoutApiToken: formData.isManualMode ? undefined : formData.nightscoutApiToken,
        lowGlucose: parseInt(formData.lowGlucose),
        highGlucose: parseInt(formData.highGlucose)
      });
    }
  };

  const testConnection = async () => {
    if (!formData.nightscoutUrl || !formData.nightscoutApiToken) {
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/test-nightscout-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.nightscoutUrl,
          token: formData.nightscoutApiToken
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Connection successful!');
      } else {
        alert(`❌ Connection failed: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Connection test failed. Please check your credentials.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Diabetes Settings</h2>
        <p className="text-gray-600">Configure your glucose data source</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="isManualMode"
                checked={formData.isManualMode}
                onChange={(e) => setFormData({ ...formData, isManualMode: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="isManualMode" className="font-semibold text-gray-900 cursor-pointer">
                Manual Mode
              </label>
              <p className="text-sm text-gray-600">
                Enable if you don't have Nightscout or prefer manual data entry
              </p>
            </div>
          </div>
        </div>

        {!formData.isManualMode && (
          <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
              </svg>
              Nightscout Connection
            </h3>

            <div>
              <label htmlFor="nightscoutUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                Nightscout URL
              </label>
              <input
                type="url"
                id="nightscoutUrl"
                value={formData.nightscoutUrl}
                onChange={(e) => setFormData({ ...formData, nightscoutUrl: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.nightscoutUrl ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="https://your-site.herokuapp.com"
              />
              {errors.nightscoutUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.nightscoutUrl}</p>
              )}
            </div>

            <div>
              <label htmlFor="nightscoutApiToken" className="block text-sm font-semibold text-gray-700 mb-2">
                API Token
              </label>
              <div className="relative">
                <input
                  type={showApiToken ? 'text' : 'password'}
                  id="nightscoutApiToken"
                  value={formData.nightscoutApiToken}
                  onChange={(e) => setFormData({ ...formData, nightscoutApiToken: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12 ${
                    errors.nightscoutApiToken ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Your Nightscout API token"
                />
                <button
                  type="button"
                  onClick={() => setShowApiToken(!showApiToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showApiToken ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.nightscoutApiToken && (
                <p className="mt-1 text-sm text-red-600">{errors.nightscoutApiToken}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Find this in Nightscout Settings → Security
              </p>
            </div>

            <button
              type="button"
              onClick={testConnection}
              disabled={isTestingConnection || !formData.nightscoutUrl || !formData.nightscoutApiToken}
              className="w-full bg-white border-2 border-blue-600 text-blue-600 py-2 px-4 rounded-lg font-semibold hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection ? (
                <>
                  <svg className="inline-block animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>
          </div>
        )}

        {formData.isManualMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Manual Mode Enabled</h3>
                <p className="mt-1 text-sm text-amber-700">
                  You'll be able to manually enter glucose readings and treatments. Data will be stored locally for 7 days.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Target Glucose Range</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lowGlucose" className="block text-sm font-semibold text-gray-700 mb-2">
                Low (mg/dL)
              </label>
              <input
                type="number"
                id="lowGlucose"
                min="60"
                max="110"
                value={formData.lowGlucose}
                onChange={(e) => setFormData({ ...formData, lowGlucose: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.lowGlucose ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.lowGlucose && (
                <p className="mt-1 text-sm text-red-600">{errors.lowGlucose}</p>
              )}
            </div>

            <div>
              <label htmlFor="highGlucose" className="block text-sm font-semibold text-gray-700 mb-2">
                High (mg/dL)
              </label>
              <input
                type="number"
                id="highGlucose"
                min="110"
                max="200"
                value={formData.highGlucose}
                onChange={(e) => setFormData({ ...formData, highGlucose: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.highGlucose ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.highGlucose && (
                <p className="mt-1 text-sm text-red-600">{errors.highGlucose}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Used for time-in-range calculations and statistics
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200"
          >
            <svg className="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back
          </button>
          
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Next Step
            <svg className="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

