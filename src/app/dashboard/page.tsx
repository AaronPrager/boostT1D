'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  averageGlucose: number;
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
    averageGlucose: 0,
    totalReadings: 0,
    lastUpdated: null,
    trend: 'stable'
  });
  const [settings, setSettings] = useState<Settings>({
    nightscoutUrl: '',
    lowGlucose: 70,
    highGlucose: 180,
  });

  useEffect(() => {
    if (session) {
      fetchSettings().then(() => {
        // After settings are loaded, fetch dashboard data
        fetchDashboardData();
        
        // If Nightscout is configured, also trigger a sync to get latest data
        if (settings.nightscoutUrl) {
          // Small delay to ensure settings are updated
          setTimeout(() => {
            handleRefresh();
          }, 500);
        }
      });
    }
  }, [session]);

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

  const fetchDashboardData = async (showRefreshFeedback = false) => {
    if (showRefreshFeedback) {
      setRefreshing(true);
      setRefreshMessage(null);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Check if Nightscout is configured
      if (!settings.nightscoutUrl) {
        // Only fetch manual data if Nightscout is not configured
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const url = new URL('/api/readings', window.location.origin);
        url.searchParams.set('startDate', startDate.getTime().toString());
        url.searchParams.set('endDate', endDate.getTime().toString());
        url.searchParams.set('source', 'manual'); // Only manual readings

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch manual readings');
        }

        const readings: Reading[] = await response.json();
        
        // Sort by date (most recent first)
        const sortedReadings = readings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentReadings(sortedReadings);

        // Calculate stats from manual readings only
        if (sortedReadings.length > 0) {
          const currentReading = sortedReadings[0];
          const inRangeReadings = sortedReadings.filter(r => 
            r.sgv >= settings.lowGlucose && r.sgv <= settings.highGlucose
          );
          const averageGlucose = sortedReadings.reduce((sum, r) => sum + r.sgv, 0) / sortedReadings.length;

          setStats({
            currentGlucose: currentReading.sgv,
            currentDirection: currentReading.direction || null,
            timeInRange: Math.round((inRangeReadings.length / sortedReadings.length) * 100),
            averageGlucose: Math.round(averageGlucose),
            totalReadings: sortedReadings.length,
            lastUpdated: currentReading.date,
            trend: 'stable' // Default trend for manual data
          });
        } else {
          setStats({
            currentGlucose: null,
            currentDirection: null,
            timeInRange: 0,
            averageGlucose: 0,
            totalReadings: 0,
            lastUpdated: null,
            trend: 'stable'
          });
        }
      } else {
        // Fetch combined data (Nightscout + manual) if Nightscout is configured
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const url = new URL('/api/readings', window.location.origin);
        url.searchParams.set('startDate', startDate.getTime().toString());
        url.searchParams.set('endDate', endDate.getTime().toString());
        url.searchParams.set('source', 'combined');

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch readings');
        }

        const readings: Reading[] = await response.json();
        
        // Sort by date (most recent first)
        const sortedReadings = readings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentReadings(sortedReadings);

        // Calculate stats
        if (sortedReadings.length > 0) {
          const currentReading = sortedReadings[0];
          const inRangeReadings = sortedReadings.filter(r => 
            r.sgv >= settings.lowGlucose && r.sgv <= settings.highGlucose
          );
          const averageGlucose = sortedReadings.reduce((sum, r) => sum + r.sgv, 0) / sortedReadings.length;

          // Calculate trend (simple comparison with previous period)
          const midPoint = Math.floor(sortedReadings.length / 2);
          const recentAvg = sortedReadings.slice(0, midPoint).reduce((sum, r) => sum + r.sgv, 0) / midPoint;
          const olderAvg = sortedReadings.slice(midPoint).reduce((sum, r) => sum + r.sgv, 0) / (sortedReadings.length - midPoint);
          
          let trend: 'improving' | 'stable' | 'declining' = 'stable';
          if (recentAvg < olderAvg - 10) trend = 'improving';
          else if (recentAvg > olderAvg + 10) trend = 'declining';

          setStats({
            currentGlucose: currentReading.sgv,
            currentDirection: currentReading.direction || null,
            timeInRange: Math.round((inRangeReadings.length / sortedReadings.length) * 100),
            averageGlucose: Math.round(averageGlucose),
            totalReadings: sortedReadings.length,
            lastUpdated: currentReading.date,
            trend
          });
        } else {
          setStats({
            currentGlucose: null,
            currentDirection: null,
            timeInRange: 0,
            averageGlucose: 0,
            totalReadings: 0,
            lastUpdated: null,
            trend: 'stable'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMessage(null);
    setError(null);

    try {
      // First, sync fresh data from Nightscout
      console.log('Starting Nightscout sync...');
      const syncResponse = await fetch('/api/nightscout/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (syncResponse.ok) {
        const syncResult = await syncResponse.json();
        console.log('Nightscout sync result:', syncResult);
        
        // Show sync status message
        if (syncResult.storedCount > 0) {
          setRefreshMessage(`✅ Synced ${syncResult.storedCount} new readings from Nightscout!`);
        } else {
          setRefreshMessage(`✅ Nightscout data is up to date (${syncResult.fetchedCount} readings checked)`);
        }
      } else {
        const errorText = await syncResponse.text();
        console.error('Nightscout sync failed:', errorText);
        setRefreshMessage(`⚠️ Nightscout sync failed: ${errorText}. Showing existing data.`);
      }

      // Always fetch and refresh the dashboard data after sync attempt
      await fetchDashboardData(false); // Don't show additional refresh feedback since we're already showing sync status
      
    } catch (error) {
      console.error('Error during refresh:', error);
      setError('Failed to refresh data from Nightscout. Showing existing data.');
      
      // Still try to refresh local data even if sync fails
      await fetchDashboardData(false);
    } finally {
      setRefreshing(false);
      
      // Clear the refresh message after 5 seconds
      setTimeout(() => setRefreshMessage(null), 5000);
    }
  };

  const getGlucoseStatus = (glucose: number) => {
    if (glucose < settings.lowGlucose) return { status: 'low', color: 'text-red-600 bg-red-100' };
    if (glucose > settings.highGlucose) return { status: 'high', color: 'text-orange-600 bg-orange-100' };
    return { status: 'normal', color: 'text-green-600 bg-green-100' };
  };

  const getDirectionIcon = (direction: string | null) => {
    switch (direction) {
      case 'DoubleUp': return '⬆⬆';
      case 'SingleUp': return '⬆';
      case 'FortyFiveUp': return '↗';
      case 'Flat': return '→';
      case 'FortyFiveDown': return '↘';
      case 'SingleDown': return '⬇';
      case 'DoubleDown': return '⬇⬇';
      default: return '•';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '📊';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
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
                  <p>No Nightscout</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nightscout Not Configured Message */}
        {!settings.nightscoutUrl && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-yellow-800 font-medium">Nightscout not configured</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Only manually entered data is displayed. Configure Nightscout in your profile settings to sync real-time data.
                </p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎯</div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.timeInRange}%</p>
                <p className="text-sm text-gray-600">Time in Range</p>
                <p className="text-xs text-gray-500">Last 7 days</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.averageGlucose}</p>
                <p className="text-sm text-gray-600">Average Glucose</p>
                <p className="text-xs text-gray-500">mg/dL</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">{getTrendIcon(stats.trend)}</div>
              <div>
                <p className="text-2xl font-bold text-gray-700 capitalize">{stats.trend}</p>
                <p className="text-sm text-gray-600">7-Day Trend</p>
                <p className="text-xs text-gray-500">vs previous period</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📈</div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.totalReadings}</p>
                <p className="text-sm text-gray-600">Total Readings</p>
                <p className="text-xs text-gray-500">Last 7 days</p>
              </div>
            </div>
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
                  href="/analysis"
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="text-2xl mr-4">🔍</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Pattern Analysis</h4>
                    <p className="text-sm text-gray-600">Get insights and recommendations</p>
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
                  href="/settings"
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  <div className="text-2xl mr-4">⚙️</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Settings</h4>
                    <p className="text-sm text-gray-600">Configure targets and Nightscout</p>
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