'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Settings = {
  nightscoutUrl: string;
  nightscoutApiToken: string;
  lowGlucose: number;
  highGlucose: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    nightscoutUrl: '',
    nightscoutApiToken: '',
    lowGlucose: 70.0,
    highGlucose: 180.0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings({
            nightscoutUrl: data.nightscoutUrl ?? '',
            nightscoutApiToken: data.nightscoutApiToken ?? '',
            lowGlucose: Number(data.lowGlucose) || 70.0,
            highGlucose: Number(data.highGlucose) || 180.0
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to load settings');
      } finally {
        setIsInitialLoad(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (name: keyof Settings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [name]: name === 'lowGlucose' || name === 'highGlucose' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          lowGlucose: Number(settings.lowGlucose),
          highGlucose: Number(settings.highGlucose),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Error: ${response.status}`);
      }

      const data = await response.json();
      setSuccess('Settings updated successfully');
      setSettings(data);
      router.refresh();
    } catch (error) {
      console.error('Settings update error:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="nightscoutUrl" className="block text-sm font-medium text-gray-700">
                  Nightscout URL
                </label>
                <input
                  type="url"
                  id="nightscoutUrl"
                  name="nightscoutUrl"
                  value={settings.nightscoutUrl ?? ''}
                  onChange={(e) => handleChange('nightscoutUrl', e.target.value)}
                  placeholder="https://your-site.herokuapp.com"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">Your Nightscout site URL</p>
              </div>

              <div>
                <label htmlFor="nightscoutApiToken" className="block text-sm font-medium text-gray-700">
                  Nightscout API Token
                </label>
                <input
                  type="password"
                  id="nightscoutApiToken"
                  name="nightscoutApiToken"
                  value={settings.nightscoutApiToken ?? ''}
                  onChange={(e) => handleChange('nightscoutApiToken', e.target.value)}
                  placeholder="Enter your API token"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">Your Nightscout API token (if required)</p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="lowGlucose" className="block text-sm font-medium text-gray-700">
                    Low Glucose Threshold (mg/dL)
                  </label>
                  <input
                    type="number"
                    id="lowGlucose"
                    name="lowGlucose"
                    min="40"
                    max="100"
                    value={settings.lowGlucose ?? 70}
                    onChange={(e) => handleChange('lowGlucose', parseFloat(e.target.value))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">Range: 40-100 mg/dL</p>
                </div>

                <div>
                  <label htmlFor="highGlucose" className="block text-sm font-medium text-gray-700">
                    High Glucose Threshold (mg/dL)
                  </label>
                  <input
                    type="number"
                    id="highGlucose"
                    name="highGlucose"
                    min="120"
                    max="300"
                    value={settings.highGlucose ?? 180}
                    onChange={(e) => handleChange('highGlucose', parseFloat(e.target.value))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">Range: 120-300 mg/dL</p>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">{success}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 