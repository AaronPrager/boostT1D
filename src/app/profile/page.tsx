'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

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

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nightscoutUrl, setNightscoutUrl] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setNightscoutUrl(data.nightscoutUrl || '');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const fetchProfile = async () => {
    if (!nightscoutUrl) {
      setError('Please enter your Nightscout URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/nightscout/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: nightscoutUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    try {
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

      alert('Profile saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
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
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Nightscout URL</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              value={nightscoutUrl}
              onChange={(e) => setNightscoutUrl(e.target.value)}
              className="flex-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="https://your-site.herokuapp.com"
            />
            <button
              onClick={fetchProfile}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Fetch Profile
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
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
            <div className="spinner">Loading...</div>
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">General Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">DIA (hours)</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.dia}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Units</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.units}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.timezone}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Insulin Sensitivity Factor (ISF)</h2>
              <div className="space-y-2">
                {profile.sens.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    {formatTimeValue(item)}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Carb Ratio (IC)</h2>
              <div className="space-y-2">
                {profile.carbratio.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    {formatTimeValue(item)}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Basal Rates</h2>
              <div className="space-y-2">
                {profile.basal.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    {formatTimeValue(item)}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Target Range</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Low</h3>
                  <div className="space-y-2">
                    {profile.target_low.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded">
                        {formatTimeValue(item)}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">High</h3>
                  <div className="space-y-2">
                    {profile.target_high.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded">
                        {formatTimeValue(item)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveProfile}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Save Profile Locally
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 