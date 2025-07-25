'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

export default function DiabetesProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
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
  const [manualMode, setManualMode] = useState(false);
  const [manualProfile, setManualProfile] = useState<Profile>({
    dia: 0,
    carbratio: [{ time: '', value: 0 }],
    sens: [{ time: '', value: 0 }],
    basal: [{ time: '', value: 0 }],
    target_low: [{ time: '00:00', value: 70 }],
    target_high: [{ time: '00:00', value: 180 }],
    timezone: '',
    units: 'mg/dL',
  });
  const [manualProfileError, setManualProfileError] = useState('');
  const [manualProfileSuccess, setManualProfileSuccess] = useState('');
  const [manualEditMode, setManualEditMode] = useState(false);

  const emptyTimeValue = { time: '', value: 0 };
  const isFirstTime = !settings.nightscoutUrl && !manualMode;

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

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

    fetchSettings();
    loadFromDatabase();
  }, [session, router]);

  const loadFromDatabase = async () => {
    setLoading(true);
    setError(null);
    setLoadingMessage('Loading profile from database...');

    try {
      const localResponse = await fetch('/api/diabetes-profile');
      
      if (localResponse.ok) {
        const localProfile = await localResponse.json();
        if (localProfile && Object.keys(localProfile).length > 0) {
          console.log('Loaded profile from database');
          setProfile(localProfile);
          setLoadingMessage('Profile loaded from database');
          setProfileSource('local');
          setLastSavedTime(new Date().toLocaleString());
          return;
        }
      }

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
        const saveResponse = await fetch('/api/diabetes-profile', {
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
          // Do not set an error if Nightscout is not configured
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

  const handleManualModeToggle = async (checked: boolean) => {
    setManualMode(checked);
    if (checked) {
      const updatedSettings = {
        ...settings,
        nightscoutUrl: '',
        nightscoutApiToken: ''
      };
      
      try {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedSettings),
        });
        
        if (response.ok) {
          setSettings(updatedSettings);
          setSettingsSuccess('Settings updated - Nightscout disabled');
          setTimeout(() => setSettingsSuccess(''), 3000);
        }
      } catch (error) {
        console.error('Error updating settings:', error);
        setSettingsError('Failed to update settings');
      }
      
      try {
        const profileResponse = await fetch('/api/diabetes-profile');
        if (profileResponse.ok) {
          const data = await profileResponse.json();
          if (data && Object.keys(data).length > 0) {
            setManualProfile({ ...manualProfile, ...data });
          }
        }
      } catch (err) {
        // Ignore errors, fallback to default manualProfile
      }
    }
  };

  const formatTimeValue = (timeValue: TimeValue) => {
    const time = timeValue.time.padStart(5, '0');
    return `${time} - ${timeValue.value}`;
  };

  const handleManualChange = (field: keyof Profile, value: any) => {
    setManualProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleManualTimeValueChange = (field: keyof Profile, idx: number, key: 'time' | 'value', value: any) => {
    setManualProfile((prev) => ({
      ...prev,
      [field]: Array.isArray(prev[field])
        ? (prev[field] as TimeValue[]).map((item: TimeValue, i: number) => i === idx ? { ...item, [key]: value } : item)
        : prev[field],
    }));
  };

  const addManualTimeValue = (field: keyof Profile) => {
    setManualProfile((prev) => ({
      ...prev,
      [field]: Array.isArray(prev[field])
        ? [...(prev[field] as TimeValue[]), { time: '', value: 0 }]
        : prev[field],
    }));
  };

  const removeManualTimeValue = (field: keyof Profile, idx: number) => {
    setManualProfile((prev) => ({
      ...prev,
      [field]: Array.isArray(prev[field])
        ? (prev[field] as TimeValue[]).filter((_: any, i: number) => i !== idx)
        : prev[field],
    }));
  };

  const handleManualProfileSave = async () => {
    setManualProfileError('');
    setManualProfileSuccess('');
    if (!manualProfile.units) {
      setManualProfileError('Please fill in all required fields.');
      return;
    }
    try {
      const response = await fetch('/api/diabetes-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualProfile),
      });
      if (!response.ok) throw new Error('Failed to save manual profile');
      setManualProfileSuccess('Profile saved successfully!');
      setProfile(manualProfile);
      setProfileSource('local');
      setLastSavedTime(new Date().toLocaleString());
    } catch (err) {
      setManualProfileError(err instanceof Error ? err.message : 'Failed to save manual profile');
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Please sign in to view your diabetes profile settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
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

      <div className="max-w-4xl mx-auto">
        {isFirstTime && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-blue-900 font-semibold text-lg mb-2">Welcome to Your Diabetes Profile! 📊</h3>
                <p className="text-blue-800 mb-3">
                  This is your first time here. Set up your Nightscout connection or configure your diabetes settings manually to get started.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 p-8 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-6">Nightscout & Glucose Settings</h2>
          
          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            <div className="mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={manualMode}
                  onChange={e => handleManualModeToggle(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Nightscout profile not available, I will proceed manually</span>
              </label>
            </div>

            {!manualMode ? (
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
            ) : (
              <div></div>
            )}

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

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={settingsLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {settingsLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {loading && (
            <div className="text-center py-4">
              <div className="spinner">{loadingMessage}</div>
            </div>
          )}
        </div>
      </div>

      {profile && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 p-8 rounded-xl shadow-lg space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Diabetes Profile Data</h2>
              {manualMode && !manualEditMode && (
                <button type="button" onClick={() => setManualEditMode(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Edit</button>
              )}
            </div>
          
            {!manualEditMode ? (
              <div className="space-y-6">
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
                            {item.value}
                          </div>
                        )) || <p className="text-gray-500 italic">No low target data available</p>}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium mb-3 text-red-600">High Targets</h4>
                      <div className="space-y-2">
                        {profile.target_high?.map((item, index) => (
                          <div key={index} className="bg-red-50 border border-red-200 p-3 rounded">
                            {item.value}
                          </div>
                        )) || <p className="text-gray-500 italic">No high target data available</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Units</label>
                  <select value={manualProfile.units} onChange={e => handleManualChange('units', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    <option value="mg/dL">mg/dL</option>
                    <option value="mmol/L">mmol/L</option>
                  </select>
                </div>
                {['sens','carbratio','basal'].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700">{
                      field === 'sens' ? 'Insulin Sensitivity Factor' :
                      field === 'carbratio' ? 'Carb Ratio' :
                      field.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())
                    }</label>
                    {Array.isArray(manualProfile[field as keyof Profile]) && (manualProfile[field as keyof Profile] as TimeValue[]).map((item: TimeValue, idx: number) => (
                      <div key={idx} className="flex space-x-2 mb-2">
                        <input type="time" value={item.time} onChange={e => handleManualTimeValueChange(field as keyof Profile, idx, 'time', e.target.value)} className="border border-gray-300 rounded-md py-2 px-3" />
                        <input type="number" value={item.value} onChange={e => handleManualTimeValueChange(field as keyof Profile, idx, 'value', parseFloat(e.target.value))} className="border border-gray-300 rounded-md py-2 px-3" />
                        <button type="button" onClick={() => removeManualTimeValue(field as keyof Profile, idx)} className="px-2 py-1 bg-red-100 text-red-700 rounded">Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addManualTimeValue(field as keyof Profile)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded">Add</button>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Low Target (mg/dL)</label>
                  <input type="number" value={manualProfile.target_low[0]?.value ?? ''} onChange={e => setManualProfile(prev => ({ ...prev, target_low: [{ time: '00:00', value: parseFloat(e.target.value) }] }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">High Target (mg/dL)</label>
                  <input type="number" value={manualProfile.target_high[0]?.value ?? ''} onChange={e => setManualProfile(prev => ({ ...prev, target_high: [{ time: '00:00', value: parseFloat(e.target.value) }] }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
                {manualProfileError && <div className="text-red-600">{manualProfileError}</div>}
                {manualProfileSuccess && <div className="text-green-600">{manualProfileSuccess}</div>}
                <div className="flex justify-end">
                  <button type="button" onClick={async () => { await handleManualProfileSave(); setManualEditMode(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {manualMode && !isFirstTime && (
        <div className="mt-8 text-xs text-blue-700 text-center opacity-80">
          <span className="inline-flex items-center px-3 py-1 bg-blue-50 border border-blue-200 rounded">
            <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Manual mode is active. You can switch to Nightscout at any time in settings.
          </span>
        </div>
      )}
    </div>
  );
} 