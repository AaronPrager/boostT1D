'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getGlucoseStatus, getDirectionIcon, getTrendIcon, formatTime, formatRelativeTime, getVariabilityColor } from '@/lib/dashboardUtils';

type Reading = {
  id: string;
  sgv: number;
  date: string;
  direction?: string;
  source: 'manual' | 'nightscout';
  type: string;
};

type Settings = {
  nightscoutUrl: string;
  lowGlucose: number;
  highGlucose: number;
};

type DashboardStats = {
  currentGlucose: number | null;
  currentDirection: string | null;
  previousGlucose: number | null;
  glucoseDifference: number | null;
  measurementTime: string | null;
  timeInRange: number;
  timeAboveRange: number;
  timeBelowRange: number;
  averageGlucose: number;
  glucoseVariability: number;
  totalReadings: number;
  lastUpdated: string | null;
  trend: 'improving' | 'stable' | 'declining';
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>({
    currentGlucose: null,
    currentDirection: null,
    previousGlucose: null,
    glucoseDifference: null,
    measurementTime: null,
    timeInRange: 0,
    timeAboveRange: 0,
    timeBelowRange: 0,
    averageGlucose: 0,
    glucoseVariability: 0,
    totalReadings: 0,
    lastUpdated: null,
    trend: 'stable'
  });
  const [settings, setSettings] = useState<Settings>({
    nightscoutUrl: '',
    lowGlucose: 70,
    highGlucose: 180,
  });
  // Track the date range for the dashboard (last 30 days for manual mode, 7 days for Nightscout)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Use 30 days to ensure we catch manual readings
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Include tomorrow to ensure we get today's readings
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const pathname = usePathname();

  // Fetch current user data to get updated name
  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/personal-profile');
      if (response.ok) {
        const userData = await response.json();
        setUserName(userData.name || userData.email?.split('@')[0] || 'User');
      }
    } catch (error) {
      // Fallback to session data
      setUserName(session?.user?.name || session?.user?.email?.split('@')[0] || 'User');
    }
  };

  // Increment refreshTrigger every time we navigate to /dashboard
  useEffect(() => {
    if (pathname === '/dashboard') {
      setRefreshTrigger((t) => t + 1);
      // Auto-sync with Nightscout when navigating to dashboard
      syncWithNightscout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // On every dashboard visit, set date range to last 30 days and fetch data
  useEffect(() => {
    if (session && pathname === '/dashboard') {
      setLoading(true);
      setError(null);
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 1); // Include tomorrow
      newEnd.setHours(23, 59, 59, 999);
      const newStart = new Date();
      newStart.setDate(newStart.getDate() - 30); // Use 30 days for manual mode
      newStart.setHours(0, 0, 0, 0);
      setStartDate(newStart);
      setEndDate(newEnd);
      
      // Load data automatically
      const loadDashboardData = async () => {
        try {
          // First fetch user data to get updated name
          await fetchUserData();
          
          // Then fetch settings
          const settingsRes = await fetch('/api/settings');
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            setSettings(settingsData);
          }
          
          // Then fetch dashboard data (without automatic sync)
          await fetchDashboardData(newStart, newEnd);
        } catch (error) {
          setError('Failed to load dashboard data. Please try refreshing the page.');
          setLoading(false);
        }
      };
      
      loadDashboardData();
    }
  }, [session, refreshTrigger]);

  // Initialize userName when session is available
  useEffect(() => {
    if (session && !userName) {
      setUserName(session.user?.name || session.user?.email?.split('@')[0] || 'User');
    }
  }, [session, userName]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
    }
  };

  const syncWithNightscout = async () => {
    try {

      const response = await fetch('/api/nightscout/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {

        // Refresh dashboard data after successful sync
        await fetchDashboardData();
      } else {
        const errorText = await response.text();
        // Don't show error to user for auto-sync, just log it
      }
    } catch (error) {
      // Don't show error to user for auto-sync, just log it
    }
  };

  const fetchDashboardData = async (customStart?: Date, customEnd?: Date, showRefreshFeedback = false) => {
    if (showRefreshFeedback) {
      setRefreshing(true);
      setRefreshMessage(null);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Get current settings to ensure we have the latest data
      const settingsRes = await fetch('/api/settings');
      const currentSettings = settingsRes.ok ? await settingsRes.json() : settings;
      
      // Check if Nightscout is configured
      const source = currentSettings.nightscoutUrl ? 'combined' : 'manual';
      const useStart = customStart || startDate;
      const useEnd = customEnd || endDate;

      const url = new URL('/api/readings', window.location.origin);
      url.searchParams.set('startDate', useStart.getTime().toString());
      url.searchParams.set('endDate', useEnd.getTime().toString());
      url.searchParams.set('source', source);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch readings from ${source} source`);
      }

      const data = await response.json();

      const readings = data.filter((r: any) => r.sgv && r.sgv > 0);

      if (readings.length === 0) {

        // If still loading, show a waiting message instead of an error
        if (loading || refreshing) {
          setError('Please wait, loading your data...');
        } else {
          // No readings is not an error - just clear any existing error
          setError(null);
        }
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Calculate statistics
      const totalReadings = readings.length;
      const averageGlucose = readings.reduce((sum: number, r: any) => sum + r.sgv, 0) / totalReadings;
      
      const inRange = readings.filter((r: any) => r.sgv >= currentSettings.lowGlucose && r.sgv <= currentSettings.highGlucose).length;
      const aboveRange = readings.filter((r: any) => r.sgv > currentSettings.highGlucose).length;
      const belowRange = readings.filter((r: any) => r.sgv < currentSettings.lowGlucose).length;
      
      const timeInRange = (inRange / totalReadings) * 100;
      const timeAboveRange = (aboveRange / totalReadings) * 100;
      const timeBelowRange = (belowRange / totalReadings) * 100;

      // Calculate glucose variability (coefficient of variation)
      const variance = readings.reduce((sum: number, r: any) => sum + Math.pow(r.sgv - averageGlucose, 2), 0) / totalReadings;
      const glucoseVariability = (Math.sqrt(variance) / averageGlucose) * 100;

      // Get current glucose and direction
      const sortedReadings = readings.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // In Nightscout mode, prioritize Nightscout readings over manual ones
      let currentReading, previousReading;
      
      if (currentSettings.nightscoutUrl) {
        // Find the most recent Nightscout reading
        const nightscoutReadings = sortedReadings.filter((r: any) => r.source === 'nightscout');
        if (nightscoutReadings.length > 0) {
          currentReading = nightscoutReadings[0];
          // Find the previous Nightscout reading for comparison
          previousReading = nightscoutReadings[1];
        } else {
          // Fallback to manual readings if no Nightscout readings
          currentReading = sortedReadings[0];
          previousReading = sortedReadings[1];
        }
      } else {
        // In manual mode, use the most recent reading regardless of source
        currentReading = sortedReadings[0];
        previousReading = sortedReadings[1];
      }
      
      // Calculate glucose difference
      const glucoseDifference = previousReading ? currentReading.sgv - previousReading.sgv : null;
      
      // Determine trend (simplified - could be enhanced with more sophisticated analysis)
      const recentReadings = sortedReadings.slice(0, Math.min(20, sortedReadings.length));
      const olderReadings = sortedReadings.slice(20, Math.min(40, sortedReadings.length));
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentReadings.length > 0 && olderReadings.length > 0) {
        const recentAvg = recentReadings.reduce((sum: number, r: any) => sum + r.sgv, 0) / recentReadings.length;
        const olderAvg = olderReadings.reduce((sum: number, r: any) => sum + r.sgv, 0) / olderReadings.length;
        
        if (recentAvg < olderAvg - 10) trend = 'improving';
        else if (recentAvg > olderAvg + 10) trend = 'declining';
      }

      const newStats = {
          currentGlucose: currentReading?.sgv || null,
          currentDirection: currentReading?.direction || null,
          previousGlucose: previousReading?.sgv || null,
          glucoseDifference: glucoseDifference,
          measurementTime: currentReading?.date || null,
          timeInRange: Math.round(timeInRange),
          timeAboveRange: Math.round(timeAboveRange),
          timeBelowRange: Math.round(timeBelowRange),
          averageGlucose: Math.round(averageGlucose),
          glucoseVariability: Math.round(glucoseVariability),
          totalReadings,
          lastUpdated: currentReading?.date || null,
          trend
        };

      setStats(newStats);

      // Filter recent readings based on mode
      let recentReadingsToShow;
      if (currentSettings.nightscoutUrl) {
        // In Nightscout mode, only show Nightscout readings
        const nightscoutReadings = sortedReadings.filter((r: any) => r.source === 'nightscout');
        recentReadingsToShow = nightscoutReadings.slice(0, 6);
      } else {
        // In manual mode, show all readings
        recentReadingsToShow = sortedReadings.slice(0, 6);
      }

      setRecentReadings(recentReadingsToShow);

      if (showRefreshFeedback) {
        setRefreshMessage(`Successfully synced ${totalReadings} readings from ${source === 'combined' ? 'Nightscout' : 'manual data'}`);
        setTimeout(() => setRefreshMessage(null), 3000);
      }
    } catch (error) {
      setError('Failed to load dashboard data. Please check your settings and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDashboardData(startDate, endDate, true);
  };


  // Loading and authentication states
  if (status === 'loading' || !session || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900">
            {status === 'loading' ? 'Loading...' : !session ? 'Access Denied' : 'Loading Dashboard...'}
          </h1>
          <p className="mt-2 text-gray-600">
            {status === 'loading' ? 'Checking your authentication status.' : 
             !session ? 'Please sign in to view your dashboard.' : 
             'Fetching your latest data.'}
          </p>
          {!session && (
            <Link 
              href="/login"
              className="mt-4 inline-block bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
                <span className="text-gray-900">Welcome back, </span>
                <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  {userName || session.user?.name || session.user?.email?.split('@')[0] || 'User'}!
                </span>
              </h1>
              <p className="text-2xl text-gray-600 max-w-3xl leading-relaxed mb-4">
                Here&apos;s an overview of your diabetes management
              </p>
              {stats.totalReadings > 0 && (
                <p className="text-lg text-gray-500">
                  Showing {stats.totalReadings} readings from the last 30 days
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Manual Mode Indicator Banner */}
        {!settings.nightscoutUrl && (
          <div className="mb-8 bg-gradient-to-r from-orange-100 via-amber-50 to-yellow-100 border-2 border-orange-300 rounded-xl shadow-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-orange-900">Manual Mode Active</h3>
                <div className="mt-2 text-sm text-orange-800">
                  <p>You&apos;re currently using manual data entry. Your glucose readings and treatments are stored locally. To enable automatic syncing with your CGM/pump, configure Nightscout in your <Link href="/personal-profile" className="font-semibold underline hover:text-orange-900">Personal Profile</Link>.</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link 
                    href="/readings" 
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-md"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Reading
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

        {/* Success Message */}
        {refreshMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-800 font-medium">{refreshMessage}</p>
            </div>
          </div>
        )}

        {error && error !== 'Please wait, loading your data...' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-800">
                <h3 className="font-medium">Error Loading Data</h3>
                <p className="text-sm mt-1">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current Status Card */}
        {stats.currentGlucose && (
          <div className="mb-16">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Glucose</h2>
                  <div className="flex items-center space-x-3">
                    <span className={`text-4xl font-bold px-4 py-2 rounded-lg ${getGlucoseStatus(stats.currentGlucose, settings.lowGlucose, settings.highGlucose).color}`}>
                      {stats.currentGlucose}
                    </span>
                    <span className="text-2xl">
                      {getDirectionIcon(stats.currentDirection || null)}
                    </span>
                  </div>
                  
                  {/* Measurement details */}
                  <div className="mt-3 space-y-1">
                    {stats.measurementTime && (
                      <p className="text-sm text-gray-600">
                        Measured at {formatTime(stats.measurementTime)}
                      </p>
                    )}
                    {stats.glucoseDifference !== null && stats.previousGlucose && (
                      <p className="text-sm text-gray-600">
                        {stats.glucoseDifference > 0 ? '+' : ''}{stats.glucoseDifference} from {stats.previousGlucose} 
                        <span className="text-gray-500 ml-1">
                          ({stats.glucoseDifference > 0 ? '↗' : stats.glucoseDifference < 0 ? '↘' : '→'})
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Sync Button Info */}
                <div className="flex items-center space-x-4">
                  {settings.nightscoutUrl && (
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      {refreshing ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Syncing...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sync from Nightscout
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid - Only show if we have data */}
        {stats.totalReadings > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-16">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {stats.timeInRange}%
              </div>
              <div className="text-lg text-gray-600 font-medium">Time in Range</div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {stats.timeAboveRange}%
              </div>
              <div className="text-lg text-gray-600 font-medium">Time Above</div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {stats.timeBelowRange}%
              </div>
              <div className="text-lg text-gray-600 font-medium">Time Below</div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats.averageGlucose}
              </div>
              <div className="text-lg text-gray-600 font-medium">Avg Glucose</div>
            </div>
          </div>
        )}

        {/* A1C and Variability Row - Only show if we have data */}
        {stats.totalReadings > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {((stats.averageGlucose + 46.7) / 28.7).toFixed(1)}%
              </div>
              <div className="text-lg text-gray-600 font-medium">Est. A1C</div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                {stats.glucoseVariability}%
              </div>
              <div className="text-lg text-gray-600 font-medium">Variability</div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Readings */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Recent Readings</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center text-lg text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    title="Sync fresh data from Nightscout"
                  >
                    <svg className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshing ? 'Syncing...' : 'Sync'}
                  </button>
                  <Link 
                    href="/readings"
                    className="text-blue-600 hover:text-blue-800 text-lg font-medium"
                  >
                    View All →
                  </Link>
                </div>
              </div>
            </div>
            <div className="p-8">
              {recentReadings.length > 0 ? (
                <div className="space-y-4">
                  {recentReadings.slice(0, 6).map((reading) => (
                    <div key={reading.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center space-x-4">
                        <span className="px-4 py-2 rounded-full text-lg font-medium bg-blue-100 text-blue-900">
                          {reading.sgv}
                        </span>
                        <span className="text-lg text-gray-600">
                          {getDirectionIcon(reading.direction || null)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-medium text-gray-900">{formatTime(reading.date)}</p>
                        <p className="text-sm text-gray-500">{formatRelativeTime(reading.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recent readings found</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
            <div className="p-8 border-b border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 gap-6">
                <Link 
                  href="/diabetes-profile"
                  className="flex items-center p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Profile & Settings</h4>
                    <p className="text-lg text-gray-600">Configure targets and Nightscout</p>
                  </div>
                </Link>

                <Link 
                  href="/treatments"
                  className="flex items-center p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Log Treatment</h4>
                    <p className="text-lg text-gray-600">Record insulin or medication</p>
                  </div>
                </Link>

                <Link 
                  href="/readings"
                  className="flex items-center p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">View Readings</h4>
                    <p className="text-lg text-gray-600">Browse your glucose data</p>
                  </div>
                </Link>

                <Link 
                  href="/analysis"
                  className="flex items-center p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Therapy Adjustments</h4>
                    <p className="text-lg text-gray-600">Get AI-powered recommendations</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 