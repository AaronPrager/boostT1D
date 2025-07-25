'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    currentGlucose: null,
    currentDirection: null,
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
  // Track the date range for the dashboard (last 7 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const pathname = usePathname();

  // Increment refreshTrigger every time we navigate to /dashboard
  useEffect(() => {
    if (pathname === '/dashboard') {
      setRefreshTrigger((t) => t + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // On every dashboard visit, set date range to last week and fetch data
  useEffect(() => {
    if (session && pathname === '/dashboard') {
      setLoading(true);
      setError(null);
      const newEnd = new Date();
      newEnd.setHours(23, 59, 59, 999);
      const newStart = new Date();
      newStart.setDate(newStart.getDate() - 7);
      newStart.setHours(0, 0, 0, 0);
      setStartDate(newStart);
      setEndDate(newEnd);
      // Always fetch settings fresh, then decide to sync/fetch
      fetch('/api/settings').then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          if (data.nightscoutUrl) {
            await fetch('/api/nightscout/sync', { method: 'POST' });
          }
        }
        await fetchDashboardData(newStart, newEnd);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, refreshTrigger]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
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
      // Check if Nightscout is configured
      const source = settings.nightscoutUrl ? 'combined' : 'manual';
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
          setError('No readings found for the selected period');
        }
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Calculate statistics
      const totalReadings = readings.length;
      const averageGlucose = readings.reduce((sum: number, r: any) => sum + r.sgv, 0) / totalReadings;
      
      const inRange = readings.filter((r: any) => r.sgv >= settings.lowGlucose && r.sgv <= settings.highGlucose).length;
      const aboveRange = readings.filter((r: any) => r.sgv > settings.highGlucose).length;
      const belowRange = readings.filter((r: any) => r.sgv < settings.lowGlucose).length;
      
      const timeInRange = (inRange / totalReadings) * 100;
      const timeAboveRange = (aboveRange / totalReadings) * 100;
      const timeBelowRange = (belowRange / totalReadings) * 100;

      // Calculate glucose variability (coefficient of variation)
      const variance = readings.reduce((sum: number, r: any) => sum + Math.pow(r.sgv - averageGlucose, 2), 0) / totalReadings;
      const glucoseVariability = (Math.sqrt(variance) / averageGlucose) * 100;

      // Get current glucose and direction
      const sortedReadings = readings.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const currentReading = sortedReadings[0];
      
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

      setStats({
        currentGlucose: currentReading?.sgv || null,
        currentDirection: currentReading?.direction || null,
        timeInRange: Math.round(timeInRange),
        timeAboveRange: Math.round(timeAboveRange),
        timeBelowRange: Math.round(timeBelowRange),
        averageGlucose: Math.round(averageGlucose),
        glucoseVariability: Math.round(glucoseVariability),
        totalReadings,
        lastUpdated: currentReading?.date || null,
        trend
      });

      setRecentReadings(sortedReadings.slice(0, 6));

      if (showRefreshFeedback) {
        setRefreshMessage(`Successfully synced ${totalReadings} readings from ${source === 'combined' ? 'Nightscout' : 'manual data'}`);
        setTimeout(() => setRefreshMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check your settings and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDashboardData(startDate, endDate, true);
  };

  const getGlucoseStatus = (glucose: number) => {
    if (glucose < settings.lowGlucose) return { color: 'bg-red-100 text-red-800', status: 'Low' };
    if (glucose > settings.highGlucose) return { color: 'bg-yellow-100 text-yellow-800', status: 'High' };
    return { color: 'bg-green-100 text-green-800', status: 'In Range' };
  };

  const getDirectionIcon = (direction: string | null) => {
    switch (direction) {
      case 'DoubleUp': return '↗️↗️';
      case 'SingleUp': return '↗️';
      case 'FortyFiveUp': return '↗️';
      case 'Flat': return '→';
      case 'FortyFiveDown': return '↘️';
      case 'SingleDown': return '↘️';
      case 'DoubleDown': return '↘️↘️';
      default: return '→';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getVariabilityColor = (variability: number) => {
    if (variability < 20) return 'text-green-600';
    if (variability < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Please sign in to view your dashboard.</p>
          <Link 
            href="/auth/signin"
            className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loading Dashboard...</h1>
          <p className="mt-2 text-gray-600">Fetching your latest data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {session.user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p className="mt-2 text-gray-600">
                Here&apos;s an overview of your diabetes management
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Showing data from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {stats.lastUpdated && (
                <div className="text-right text-sm text-gray-500">
                  <p>Last updated</p>
                  <p>{formatRelativeTime(stats.lastUpdated)}</p>
                </div>
              )}
              {settings.nightscoutUrl ? (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
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
              ) : (
                <div className="text-right text-sm text-gray-500">
                  <p>Manual mode</p>
                  <p>Ready to use</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nightscout Information Message */}
        {!settings.nightscoutUrl && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-blue-900 font-semibold text-lg mb-2">Welcome to BoostT1D! 🎉</h3>
                <p className="text-blue-800 mb-3">
                  You're currently in <strong>manual mode</strong>, which means you can manually enter your glucose readings and treatments. 
                  This is perfect for getting started and testing the system.
                </p>
                <div className="bg-blue-100 rounded-lg p-4 mb-3">
                  <h4 className="text-blue-900 font-medium mb-2">To unlock full features, you can:</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• <strong>Set up Nightscout</strong> for real-time data sync from your CGM/pump</li>
                    <li>• <strong>Use manual entry</strong> for glucose readings and treatments</li>
                    <li>• <strong>Explore the dashboard</strong> with sample data to see how it works</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link 
                    href="/diabetes-profile" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configure Settings
                  </Link>
                  <Link 
                    href="/readings" 
                    className="inline-flex items-center px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md border border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Manual Readings
                  </Link>
                  <a 
                    href="https://nightscout.github.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md border border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Learn About Nightscout
                  </a>
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

        {error && (
          <div className={`mb-6 rounded-lg p-4 ${error === 'Please wait, loading your data...' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex">
              <div className={error === 'Please wait, loading your data...' ? 'text-blue-800' : 'text-red-800'}>
                <h3 className="font-medium">{error === 'Please wait, loading your data...' ? 'Loading Data' : 'Error Loading Data'}</h3>
                <p className="text-sm mt-1">{error}</p>
                {error !== 'Please wait, loading your data...' && (
                  <button 
                    onClick={handleRefresh}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Status Card */}
        {stats.currentGlucose && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Glucose</h2>
                  <div className="flex items-center space-x-3">
                    <span className={`text-4xl font-bold px-4 py-2 rounded-lg ${getGlucoseStatus(stats.currentGlucose).color}`}>
                      {stats.currentGlucose}
                    </span>
                    <span className="text-2xl">
                      {getDirectionIcon(stats.currentDirection || null)}
                    </span>
                  </div>
                  {stats.lastUpdated && (
                    <p className="text-sm text-gray-500 mt-2">
                      Last updated {formatRelativeTime(stats.lastUpdated)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Target Range</p>
                  <p className="text-lg font-medium">
                    {settings.lowGlucose} - {settings.highGlucose} mg/dL
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.timeInRange}%
            </div>
            <div className="text-sm text-gray-600">Time in Range</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.timeAboveRange}%
            </div>
            <div className="text-sm text-gray-600">Time Above</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.timeBelowRange}%
            </div>
            <div className="text-sm text-gray-600">Time Below</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.averageGlucose}
            </div>
            <div className="text-sm text-gray-600">Avg Glucose</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {((stats.averageGlucose + 46.7) / 28.7).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Est. A1C</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className={`text-2xl font-bold ${getVariabilityColor(stats.glucoseVariability)}`}>
              {stats.glucoseVariability}%
            </div>
            <div className="text-sm text-gray-600">Variability</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Readings */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Readings</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center text-sm text-gray-600 hover:text-indigo-600 disabled:text-gray-400"
                    title="Sync fresh data from Nightscout"
                  >
                    <svg className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshing ? 'Syncing...' : 'Sync'}
                  </button>
                  <Link 
                    href="/readings"
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View All →
                  </Link>
                </div>
              </div>
            </div>
            <div className="p-6">
              {recentReadings.length > 0 ? (
                <div className="space-y-3">
                  {recentReadings.slice(0, 6).map((reading) => (
                    <div key={reading.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGlucoseStatus(reading.sgv).color}`}>
                          {reading.sgv}
                        </span>
                        <span className="text-lg">
                          {getDirectionIcon(reading.direction || null)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatTime(reading.date)}</p>
                        <p className="text-xs text-gray-500">{formatRelativeTime(reading.date)}</p>
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
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <Link 
                  href="/diabetes-profile"
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  <div className="text-2xl mr-4">⚙️</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Profile & Settings</h4>
                    <p className="text-sm text-gray-600">Configure targets and Nightscout</p>
                  </div>
                </Link>

                <Link 
                  href="/treatments"
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-2xl mr-4">💊</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Log Treatment</h4>
                    <p className="text-sm text-gray-600">Record insulin or medication</p>
                  </div>
                </Link>

                <Link 
                  href="/readings"
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <div className="text-2xl mr-4">📊</div>
                  <div>
                    <h4 className="font-medium text-gray-900">View Readings</h4>
                    <p className="text-sm text-gray-600">Browse your glucose data</p>
                  </div>
                </Link>

                <Link 
                  href="/analysis"
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="text-2xl mr-4">🔍</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Therapy Adjustments</h4>
                    <p className="text-sm text-gray-600">Get AI-powered recommendations</p>
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