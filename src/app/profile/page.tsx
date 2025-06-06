'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import UserProfileHeader from '@/components/UserProfileHeader';

type TimeValue = {
  time: string;
  value: number;
  timeAsSeconds?: number;
};

type Profile = {
  dia: number;
  carbratio: TimeValue[];
  sens: TimeValue[];
  basal: TimeValue[];
  target_low: TimeValue[];
  target_high: TimeValue[];
  timezone: string;
  units: string;
};

type Settings = {
  nightscoutUrl: string;
  nightscoutApiToken: string;
  lowGlucose: number;
  highGlucose: number;
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    nightscoutUrl: '',
    nightscoutApiToken: '',
    lowGlucose: 70.0,
    highGlucose: 180.0
  });
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [profileSource, setProfileSource] = useState<'local' | 'nightscout' | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

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
        setSettingsError('Failed to load settings');
      }
    };

    if (session) {
      fetchSettings();
      // Always load from DB when page opens first
      loadFromDatabase();
    }
  }, [session]);

  const loadFromDatabase = async () => {
    setLoading(true);
    setError(null);
    setLoadingMessage('Loading profile from database...');

    try {
      // Always try to load from database first
      const localResponse = await fetch('/api/profile');
      
      if (localResponse.ok) {
        const localProfile = await localResponse.json();
        if (localProfile && Object.keys(localProfile).length > 0) {
          console.log('Loaded profile from database');
          setProfile(localProfile);
          setLoadingMessage('Profile loaded from database');
          setProfileSource('local');
          
          // Get the saved timestamp from the API response
          const profileDetails = await fetch('/api/profile');
          if (profileDetails.ok) {
            const profileData = await profileDetails.json();
            // For now, we'll set a generic saved time since the API doesn't return timestamps
            setLastSavedTime(new Date().toLocaleString());
          }
          return;
        }
      }

      // If no profile in database, try to fetch from Nightscout using stored settings
      console.log('No profile found in database, attempting to fetch from Nightscout');
      setLoadingMessage('No profile found in database. Checking Nightscout...');
      
      await refreshProfileFromNightscout();
      
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile from database');
      setLoadingMessage('');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfileFromNightscout = async () => {
    setLoading(true);
    setError(null);
    setLoadingMessage('Fetching profile from Nightscout...');

    try {
      // Use GET endpoint which uses stored settings
      const nsResponse = await fetch('/api/nightscout/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (nsResponse.ok) {
        const nsProfile = await nsResponse.json();
        console.log('Successfully fetched profile from Nightscout');
        setProfile(nsProfile);
        
        setLoadingMessage('Saving profile to database...');
        // Automatically save the fetched profile to database
        const saveResponse = await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(nsProfile),
        });

        if (saveResponse.ok) {
          console.log('Profile automatically saved to database');
          setLoadingMessage('Profile downloaded and saved successfully');
          setProfileSource('nightscout');
          setLastSavedTime(new Date().toLocaleString());
        } else {
          throw new Error('Failed to save profile to database');
        }
      } else {
        const errorData = await nsResponse.json().catch(() => null);
        if (nsResponse.status === 400) {
          setError('No Nightscout URL configured. Please update your settings first.');
        } else {
          throw new Error(errorData?.error || 'Failed to fetch profile from Nightscout');
        }
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh profile from Nightscout');
      setLoadingMessage('');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!settings.nightscoutUrl) {
      setError('Please enter your Nightscout URL');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingMessage('Fetching profile from Nightscout...');

    try {
      const response = await fetch('/api/nightscout/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: settings.nightscoutUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      setProfile(data);
      setProfileSource('nightscout');
      setLoadingMessage('Profile fetched successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      setLoadingMessage('');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    try {
      setLoadingMessage('Saving profile locally...');
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      setProfileSource('local');
      alert('Profile saved successfully!');
      setLoadingMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      setLoadingMessage('');
    }
  };

  const handleSettingsChange = (name: keyof Settings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [name]: name === 'lowGlucose' || name === 'highGlucose' ? Number(value) : value,
    }));
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');
    setSettingsLoading(true);

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
      setSettingsSuccess('Settings updated successfully');
      setSettings(data);
    } catch (error) {
      console.error('Settings update error:', error);
      setSettingsError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const formatTimeValue = (timeValue: TimeValue) => {
    const time = timeValue.time.padStart(5, '0');
    return `${time} - ${timeValue.value}`;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Please sign in to view your profile settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Profile Header with Photo */}
      <UserProfileHeader showDetailed={true} className="mb-8" />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Diabetes Profile & Settings</h1>
        <div className="flex flex-col items-end space-y-2">
          {lastSavedTime && (
            <p className="text-sm text-gray-600">
              Last updated on: {lastSavedTime}
            </p>
          )}
          <button
            onClick={refreshProfileFromNightscout}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Profile
          </button>
        </div>
      </div>

      {/* Nightscout & Glucose Settings Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-2xl font-semibold mb-6">Nightscout & Glucose Settings</h2>
        
        <form onSubmit={handleSettingsSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="nightscoutUrl" className="block text-sm font-medium text-gray-700">
                Nightscout URL
              </label>
            <input
                type="url"
                id="nightscoutUrl"
                name="nightscoutUrl"
                value={settings.nightscoutUrl ?? ''}
                onChange={(e) => handleSettingsChange('nightscoutUrl', e.target.value)}
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
                onChange={(e) => handleSettingsChange('nightscoutApiToken', e.target.value)}
                placeholder="Enter your API token"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">Your Nightscout API token (if required)</p>
            </div>
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
                onChange={(e) => handleSettingsChange('lowGlucose', parseFloat(e.target.value))}
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
                onChange={(e) => handleSettingsChange('highGlucose', parseFloat(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">Range: 120-300 mg/dL</p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={settingsLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {settingsLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {settingsError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{settingsError}</h3>
                </div>
              </div>
            </div>
          )}

          {settingsSuccess && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{settingsSuccess}</h3>
                </div>
              </div>
            </div>
          )}
        </form>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-6">
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

        {loading && (
          <div className="text-center py-4">
            <div className="spinner">{loadingMessage}</div>
          </div>
        )}
      </div>

      {/* Diabetes Profile Data Section */}
        {profile && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h2 className="text-2xl font-semibold mb-6">Diabetes Profile Data</h2>
          
            <div>
            <h3 className="text-xl font-semibold mb-4">General Settings</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">DIA (hours)</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{profile.dia}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Units</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{profile.units}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{profile.timezone}</p>
                </div>
              </div>
            </div>

            <div>
            <h3 className="text-xl font-semibold mb-4">Insulin Sensitivity Factor (ISF)</h3>
              <div className="space-y-2">
                {profile.sens?.map((item, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                    {formatTimeValue(item)}
                  </div>
                )) || <p className="text-gray-500 italic">No ISF data available</p>}
              </div>
            </div>

            <div>
            <h3 className="text-xl font-semibold mb-4">Carb Ratio (IC)</h3>
              <div className="space-y-2">
                {profile.carbratio?.map((item, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                    {formatTimeValue(item)}
                  </div>
                )) || <p className="text-gray-500 italic">No carb ratio data available</p>}
              </div>
            </div>

            <div>
            <h3 className="text-xl font-semibold mb-4">Basal Rates</h3>
              <div className="space-y-2">
                {profile.basal?.map((item, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                    {formatTimeValue(item)}
                  </div>
                )) || <p className="text-gray-500 italic">No basal data available</p>}
              </div>
            </div>

            <div>
            <h3 className="text-xl font-semibold mb-4">Target Range</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                <h4 className="text-lg font-medium mb-3 text-green-600">Low Targets</h4>
                  <div className="space-y-2">
                    {profile.target_low?.map((item, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 p-3 rounded">
                        {formatTimeValue(item)}
                      </div>
                    )) || <p className="text-gray-500 italic">No low target data available</p>}
                  </div>
                </div>
                <div>
                <h4 className="text-lg font-medium mb-3 text-red-600">High Targets</h4>
                  <div className="space-y-2">
                    {profile.target_high?.map((item, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 p-3 rounded">
                        {formatTimeValue(item)}
                      </div>
                    )) || <p className="text-gray-500 italic">No high target data available</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
} 