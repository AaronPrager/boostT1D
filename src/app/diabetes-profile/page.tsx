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

export default function DiabetesProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [profileSource, setProfileSource] = useState<'local' | 'nightscout' | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualProfile, setManualProfile] = useState<Profile>({
    dia: 0,
    carbratio: [{ time: '', value: 0 }],
    sens: [{ time: '', value: 0 }],
    basal: [{ time: '', value: 0 }],
    target_low: [{ time: '00:00', value: 80 }],
    target_high: [{ time: '00:00', value: 140 }],
    timezone: '',
    units: 'mg/dL',
  });
  const [manualProfileError, setManualProfileError] = useState('');
  const [manualProfileSuccess, setManualProfileSuccess] = useState('');
  const [manualEditMode, setManualEditMode] = useState(false);

  const emptyTimeValue = { time: '', value: 0 };
  const isFirstTime = !profile;

  // Debug logging

  useEffect(() => {
    // Only redirect if session is definitely not available (not loading)
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (!session || status !== 'authenticated') return;
    initializeProfile();
  }, [session]);

  const initializeProfile = async () => {
    await checkManualMode();
    await loadFromDatabase();
  };

  const checkManualMode = async () => {
    try {
      const response = await fetch('/api/personal-profile');
      if (response.ok) {
        const data = await response.json();
        // If no Nightscout URL is configured, enable manual mode
        const isManual = !data.nightscoutUrl;

        setManualMode(isManual);
        }
      } catch (error) {
      console.error('Error checking manual mode:', error);
      // Default to manual mode if we can't check settings
      setManualMode(true);
      }
    };

  const loadFromDatabase = async () => {
    setLoading(true);
    setError(null);
    setLoadingMessage('Loading profile from database...');

    try {
      const localResponse = await fetch('/api/diabetes-profile');
      
      if (localResponse.ok) {
        const localProfile = await localResponse.json();
        if (localProfile && Object.keys(localProfile).length > 0) {

          setProfile(localProfile);
          setLoadingMessage('Profile loaded from database');
          setProfileSource('local');
          setLastSavedTime(new Date().toLocaleString());
          return;
        }
      }

      // If in manual mode, don't try to fetch from Nightscout
      if (manualMode) {

        setLoadingMessage('No profile configured. Click "Configure Manual Settings" to get started.');
        setProfile(null);
        return;
      }

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

          setLoadingMessage('');
        } else if (nsResponse.status === 401) {
          // Handle authentication errors with clear guidance
          const errorMessage = errorData?.error || 'Authentication failed';

          setError('Nightscout URL or API token may be incorrect.');
        } else if (nsResponse.status === 404) {

          setError('Profile not found in Nightscout.');
        } else {
          const errorMessage = errorData?.error || `HTTP ${nsResponse.status}: ${nsResponse.statusText}`;

          setError('Failed to fetch profile from Nightscout.');
        }
      }
    } catch (err) {
      console.error('❌ Error refreshing profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh profile from Nightscout';

      setError('Failed to connect to Nightscout. Check your URL and API token.');
      setLoadingMessage('');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeValue = (timeValue: TimeValue) => {
    const time = timeValue.time.padStart(5, '0');
    return `${time} - ${timeValue.value}`;
  };

  const handleManualChange = (field: keyof Profile, value: any) => {
    // Add validation for DIA field
    if (field === 'dia') {
      const diaValue = parseFloat(value);
      if (isNaN(diaValue) || diaValue < 2 || diaValue > 12) {
        // Don't update if value is invalid
        return;
      }
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-stone-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-slate-600">Please sign in to view your diabetes profile settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Diabetes Profile</h1>
        <div className="flex flex-col items-end space-y-2">
          {lastSavedTime && (
            <p className="text-sm text-slate-600">
              Last updated on: {lastSavedTime}
            </p>
          )}
          {!manualMode && (
          <button
            onClick={() => {
              setError(null);
              refreshProfileFromNightscout();
            }}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Profile
          </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {manualMode && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-orange-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div>
                <h3 className="text-orange-800 font-semibold text-sm">Manual Mode Active</h3>
                <p className="text-orange-700 text-xs mt-1">
                  You're managing your diabetes settings manually. To switch to Nightscout mode, update your settings in Personal Profile.
                </p>
              </div>
            </div>
          </div>
        )}

        {isFirstTime && !manualMode && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-gray-600 mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold text-lg mb-2">Welcome to Your Diabetes Profile! 📊</h3>
                <p className="text-gray-700 mb-3">
                  This is your first time here. Set up your Nightscout connection or configure your diabetes settings manually to get started.
                </p>
              </div>
            </div>
          </div>
        )}

          {loading && (
            <div className="text-center py-4">
              <div className="spinner">{loadingMessage}</div>
            </div>
          )}

      {/* Show profile data when not in manual mode OR when in manual mode but not editing */}
      {!manualMode && profile && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 p-6 rounded-xl shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">Diabetes Profile Data</h2>
            </div>
          
              <div className="space-y-6">
                {/* General Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">General Settings</h3>
                  <div className="space-y-3">
                    <div className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-slate-50 to-gray-50">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Duration of Insulin Action (DIA)</label>
                      <p className="text-lg font-medium text-gray-900">{profile.dia} hours</p>
                      <p className="text-sm text-gray-600 mt-1">How long insulin stays active in your body</p>
                    </div>
                    <div className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-slate-50 to-gray-50">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Glucose Units</label>
                      <p className="text-lg font-medium text-gray-900">{profile.units}</p>
                      <p className="text-sm text-gray-600 mt-1">Unit of measurement for blood glucose</p>
                    </div>
                  </div>
                </div>

                {/* Target Range */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Target Range</h3>
                  <p className="text-sm text-gray-600 mb-4">Ideal glucose range for optimal diabetes management</p>
                  <div className="space-y-3">
                    {profile.target_low?.map((lowItem, index) => {
                      const highItem = profile.target_high?.[index];
                      return (
                        <div key={index} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <div className="mb-3">
                            <span className="text-sm font-semibold text-gray-700">Time Period: </span>
                            <span className="text-lg font-medium text-gray-900">{lowItem.time}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-semibold text-gray-700">Low Target: </span>
                              <span className="text-lg font-medium text-gray-900">{lowItem.value} mg/dL</span>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-gray-700">High Target: </span>
                              <span className="text-lg font-medium text-gray-900">{highItem?.value} mg/dL</span>
                            </div>
                          </div>
                        </div>
                      );
                    }) || <p className="text-slate-500 italic">No target range data available</p>}
                  </div>
                </div>

                {/* ISF */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Insulin Sensitivity Factor (ISF)</h3>
                  <div className="space-y-3">
                    {profile.sens?.map((item, index) => (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-gray-700">Time Period: </span>
                          <span className="text-lg font-medium text-gray-900">{item.time}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-700">ISF Value: </span>
                          <span className="text-lg font-medium text-gray-900">{item.value} {profile.units === 'mg/dL' ? 'mg/dL per unit' : 'mmol/L per unit'}</span>
                        </div>
                      </div>
                    )) || <p className="text-slate-500 italic">No ISF data available</p>}
                  </div>
                </div>

                {/* Carb Ratio */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Insulin-to-Carb Ratio (IC)</h3>
                  <div className="space-y-3">
                    {profile.carbratio?.map((item, index) => (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-gray-700">Time Period: </span>
                          <span className="text-lg font-medium text-gray-900">{item.time}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Carb Ratio: </span>
                          <span className="text-lg font-medium text-gray-900">{item.value} grams per unit</span>
                        </div>
                      </div>
                    )) || <p className="text-slate-500 italic">No carb ratio data available</p>}
                  </div>
                </div>

                {/* Basal Rates */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Basal Rates</h3>
                  <div className="space-y-3">
                    {profile.basal?.map((item, index) => (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-amber-50 to-yellow-50">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-gray-700">Time Period: </span>
                          <span className="text-lg font-medium text-gray-900">{item.time}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Basal Rate: </span>
                          <span className="text-lg font-medium text-gray-900">{item.value} units/hour</span>
                        </div>
                      </div>
                    )) || <p className="text-slate-500 italic">No basal data available</p>}
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Show manual profile form when in manual mode and not editing */}
      {manualMode && !manualEditMode && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 p-6 rounded-xl shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">
                {profile ? 'Diabetes Profile Data' : 'Configure Your Diabetes Profile'}
              </h2>
              <button 
                type="button" 
                onClick={() => {

                  setManualEditMode(true);
                }} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {profile ? 'Edit Settings' : 'Configure Settings'}
              </button>
                </div>

              <div className="space-y-6">
                {/* General Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">General Settings</h3>
                  <div className="space-y-3">
                    <div className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-slate-50 to-gray-50">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Duration of Insulin Action (DIA)</label>
                      <p className="text-lg font-medium text-gray-900">{profile?.dia ? `${profile.dia} hours` : 'Not configured'}</p>
                      <p className="text-sm text-gray-600 mt-1">How long insulin stays active in your body</p>
                    </div>
                    <div className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-slate-50 to-gray-50">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Glucose Units</label>
                      <p className="text-lg font-medium text-gray-900">{profile?.units || 'Not configured'}</p>
                      <p className="text-sm text-gray-600 mt-1">Unit of measurement for blood glucose</p>
                    </div>
                  </div>
                </div>

                {/* Target Range */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Target Range</h3>
                  <p className="text-sm text-gray-600 mb-4">Ideal glucose range for optimal diabetes management</p>
                  <div className="space-y-3">
                    {profile?.target_low?.map((lowItem, index) => {
                      const highItem = profile.target_high?.[index];
                      return (
                        <div key={index} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <div className="mb-3">
                            <span className="text-sm font-semibold text-gray-700">Time Period: </span>
                            <span className="text-lg font-medium text-gray-900">{lowItem.time}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-semibold text-gray-700">Low Target: </span>
                              <span className="text-lg font-medium text-gray-900">{lowItem.value} mg/dL</span>
                            </div>
                    <div>
                              <span className="text-sm font-semibold text-gray-700">High Target: </span>
                              <span className="text-lg font-medium text-gray-900">{highItem?.value} mg/dL</span>
                            </div>
                          </div>
                        </div>
                      );
                    }) || <p className="text-slate-500 italic">No target range data configured</p>}
                  </div>
                </div>

                {/* ISF */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Insulin Sensitivity Factor (ISF)</h3>
                  <div className="space-y-3">
                    {profile?.sens?.map((item, index) => (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-gray-700">Time Period: </span>
                          <span className="text-lg font-medium text-gray-900">{item.time}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-700">ISF Value: </span>
                          <span className="text-lg font-medium text-gray-900">{item.value} {profile?.units === 'mg/dL' ? 'mg/dL per unit' : 'mmol/L per unit'}</span>
                        </div>
                      </div>
                    )) || <p className="text-slate-500 italic">No ISF data configured</p>}
                  </div>
                </div>

                {/* Carb Ratio */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Insulin-to-Carb Ratio (IC)</h3>
                  <div className="space-y-3">
                    {profile?.carbratio?.map((item, index) => (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-gray-700">Time Period: </span>
                          <span className="text-lg font-medium text-gray-900">{item.time}</span>
                    </div>
                    <div>
                          <span className="text-sm font-semibold text-gray-700">Carb Ratio: </span>
                          <span className="text-lg font-medium text-gray-900">{item.value} grams per unit</span>
                          </div>
                      </div>
                    )) || <p className="text-slate-500 italic">No carb ratio data configured</p>}
                  </div>
                </div>

                {/* Basal Rates */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Basal Rates</h3>
                  <div className="space-y-3">
                    {profile?.basal?.map((item, index) => (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-amber-50 to-yellow-50">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-gray-700">Time Period: </span>
                          <span className="text-lg font-medium text-gray-900">{item.time}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Basal Rate: </span>
                          <span className="text-lg font-medium text-gray-900">{item.value} units/hour</span>
                      </div>
                    </div>
                    )) || <p className="text-slate-500 italic">No basal data configured</p>}
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Manual Edit Mode Form */}
      {manualEditMode && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 p-6 rounded-xl shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">Configure Diabetes Settings</h2>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setManualEditMode(false)} 
                  className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={async () => { 
                    await handleManualProfileSave(); 
                    setManualEditMode(false); 
                  }} 
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
                >
                  Save Profile
                </button>
              </div>
            </div>
            
              <div className="space-y-6">
              {/* General Settings */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">General Settings</h3>
                
                <div className="space-y-3">
                  {/* DIA Setting */}
                  <div className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-slate-50 to-gray-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Duration of Insulin Action (DIA)</label>
                    <div className="mb-2">
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          step="1"
                          min="2"
                          max="12"
                          value={manualProfile.dia} 
                          onChange={e => handleManualChange('dia', parseFloat(e.target.value))} 
                          className="w-20 border border-gray-400 rounded-md py-1.5 px-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          placeholder="6"
                        />
                        <span className="text-sm font-medium text-gray-600">hours</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">How long insulin stays active in your body (typically 4-6 hours)</p>
                  </div>

                  {/* Glucose Units Setting */}
                  <div className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-slate-50 to-gray-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Glucose Units</label>
                    <select 
                      value={manualProfile.units} 
                      onChange={e => handleManualChange('units', e.target.value)} 
                      className="w-full max-w-xs border-2 border-gray-400 rounded-lg py-3 px-4 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                    <option value="mg/dL">mg/dL</option>
                    <option value="mmol/L">mmol/L</option>
                  </select>
                    <p className="text-sm text-gray-600 mt-2">Unit of measurement for blood glucose</p>
                  </div>
                </div>
              </div>

              {/* Target Range */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Target Range</h3>
                <p className="text-xs text-gray-600 mb-3">Your ideal glucose range for optimal diabetes management (separate from alert thresholds)</p>
                
                <div className="space-y-3">
                  {manualProfile.target_low.map((lowItem, idx) => {
                    const highItem = manualProfile.target_high[idx];
                    return (
                      <div key={idx} className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                        {/* Time Input */}
                        <div className="mb-3">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Time Period</label>
                          <input 
                            type="time" 
                            value={lowItem.time} 
                            onChange={e => {
                              handleManualTimeValueChange('target_low', idx, 'time', e.target.value);
                              handleManualTimeValueChange('target_high', idx, 'time', e.target.value);
                            }} 
                            className="w-full max-w-xs border border-gray-400 rounded-md py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          />
                        </div>

                        {/* Low and High Values */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Low Target (mg/dL)</label>
                            <input 
                              type="number" 
                              step="1"
                              value={lowItem.value} 
                              onChange={e => handleManualTimeValueChange('target_low', idx, 'value', parseFloat(e.target.value))} 
                              className="w-full border border-gray-400 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                              placeholder="80"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">High Target (mg/dL)</label>
                            <input 
                              type="number" 
                              step="1"
                              value={highItem?.value || 0} 
                              onChange={e => handleManualTimeValueChange('target_high', idx, 'value', parseFloat(e.target.value))} 
                              className="w-full border border-gray-400 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                              placeholder="140"
                            />
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button 
                          type="button" 
                          onClick={() => {
                            removeManualTimeValue('target_low', idx);
                            removeManualTimeValue('target_high', idx);
                          }} 
                          className="px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-semibold transition-colors"
                        >
                          Remove This Time Period
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                {/* Add Button */}
                <div className="mt-6">
                  <button 
                    type="button" 
                    onClick={() => {
                      addManualTimeValue('target_low');
                      addManualTimeValue('target_high');
                    }} 
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-semibold transition-colors"
                  >
                    + Add Time Period
                  </button>
                </div>
              </div>

              {/* Insulin Sensitivity Factor (ISF) */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Insulin Sensitivity Factor (ISF)</h3>
                <p className="text-xs text-gray-600 mb-3">How much 1 unit of insulin lowers your blood glucose</p>
                
                <div className="space-y-3">
                  {manualProfile.sens.map((item, idx) => (
                    <div key={idx} className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                      {/* Time Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Time Period</label>
                        <input 
                          type="time" 
                          value={item.time} 
                          onChange={e => handleManualTimeValueChange('sens', idx, 'time', e.target.value)} 
                          className="w-full max-w-xs border border-gray-400 rounded-md py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      </div>

                      {/* Value Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          ISF Value ({manualProfile.units === 'mg/dL' ? 'mg/dL per unit' : 'mmol/L per unit'})
                        </label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={item.value} 
                          onChange={e => handleManualTimeValueChange('sens', idx, 'value', parseFloat(e.target.value))} 
                          className="w-full border-2 border-gray-400 rounded-lg py-3 px-4 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          placeholder="50"
                        />
                      </div>

                      {/* Remove Button */}
                      <button 
                        type="button" 
                        onClick={() => removeManualTimeValue('sens', idx)} 
                        className="px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-semibold transition-colors"
                      >
                        Remove This Time Period
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Add Button */}
                <div className="mt-6">
                  <button 
                    type="button" 
                    onClick={() => addManualTimeValue('sens')} 
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-semibold transition-colors"
                  >
                    + Add Time Period
                  </button>
                </div>
              </div>

              {/* Carb Ratio (IC) */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Insulin-to-Carb Ratio (IC)</h3>
                <p className="text-xs text-gray-600 mb-3">How many grams of carbs 1 unit of insulin covers</p>
                
                <div className="space-y-3">
                  {manualProfile.carbratio.map((item, idx) => (
                    <div key={idx} className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                      {/* Time Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Time Period</label>
                        <input 
                          type="time" 
                          value={item.time} 
                          onChange={e => handleManualTimeValueChange('carbratio', idx, 'time', e.target.value)} 
                          className="w-full max-w-xs border border-gray-400 rounded-md py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      </div>

                      {/* Value Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Carb Ratio (grams per unit)
                        </label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={item.value} 
                          onChange={e => handleManualTimeValueChange('carbratio', idx, 'value', parseFloat(e.target.value))} 
                          className="w-full border-2 border-gray-400 rounded-lg py-3 px-4 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          placeholder="15"
                        />
                      </div>

                      {/* Remove Button */}
                      <button 
                        type="button" 
                        onClick={() => removeManualTimeValue('carbratio', idx)} 
                        className="px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-semibold transition-colors"
                      >
                        Remove This Time Period
                      </button>
                      </div>
                    ))}
                </div>
                
                {/* Add Button */}
                <div className="mt-6">
                  <button 
                    type="button" 
                    onClick={() => addManualTimeValue('carbratio')} 
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-semibold transition-colors"
                  >
                    + Add Time Period
                  </button>
                </div>
              </div>

              {/* Basal Rates */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Basal Rates</h3>
                <p className="text-xs text-gray-600 mb-3">Background insulin rates throughout the day</p>
                
                <div className="space-y-3">
                  {manualProfile.basal.map((item, idx) => (
                    <div key={idx} className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-amber-50 to-yellow-50">
                      {/* Time Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Time Period</label>
                        <input 
                          type="time" 
                          value={item.time} 
                          onChange={e => handleManualTimeValueChange('basal', idx, 'time', e.target.value)} 
                          className="w-full max-w-xs border border-gray-400 rounded-md py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      </div>

                      {/* Value Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Basal Rate (units/hour)
                        </label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.value} 
                          onChange={e => handleManualTimeValueChange('basal', idx, 'value', parseFloat(e.target.value))} 
                          className="w-full border-2 border-gray-400 rounded-lg py-3 px-4 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          placeholder="0.5"
                        />
                      </div>

                      {/* Remove Button */}
                      <button 
                        type="button" 
                        onClick={() => removeManualTimeValue('basal', idx)} 
                        className="px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-semibold transition-colors"
                      >
                        Remove This Time Period
                      </button>
                  </div>
                ))}
                </div>
                
                {/* Add Button */}
                <div className="mt-6">
                  <button 
                    type="button" 
                    onClick={() => addManualTimeValue('basal')} 
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-semibold transition-colors"
                  >
                    + Add Time Period
                  </button>
                </div>
              </div>

              {/* Error/Success Messages */}
              {manualProfileError && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Error</h3>
                      <div className="mt-2 text-sm text-blue-700">{manualProfileError}</div>
                    </div>
                  </div>
                </div>
              )}
              {manualProfileSuccess && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Success</h3>
                      <div className="mt-2 text-sm text-blue-700">{manualProfileSuccess}</div>
                    </div>
                  </div>
                </div>
            )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setManualEditMode(false)} 
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={async () => { await handleManualProfileSave(); setManualEditMode(false); }} 
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
    </div>
  );
} 