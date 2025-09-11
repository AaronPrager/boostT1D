'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  TimeScale,
  ChartDataset,
  Point
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

type Reading = {
  sgv: number;
  date: number;
  direction?: string;
  type: string;
  source: 'manual' | 'nightscout';
  originalDate?: number;
};

type Settings = {
  nightscoutUrl: string;
  lowGlucose: number;
  highGlucose: number;
};

type Statistics = {
  estimatedA1C: number;
  averageGlucose: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  gmi: number;
  totalReadings: number;
  timeInRange: number;
  timeAboveRange: number;
  timeBelowRange: number;
  dailyPatterns: {
    overnight: number;
    morning: number;
    afternoon: number;
    evening: number;
  };
};

const DIRECTION_ARROWS: { [key: string]: string } = {
  'NONE': '⟷',
  'DoubleUp': '⇈',
  'SingleUp': '↑',
  'FortyFiveUp': '↗',
  'Flat': '→',
  'FortyFiveDown': '↘',
  'SingleDown': '↓',
  'DoubleDown': '⇊',
  'NOT COMPUTABLE': '-',
  'RATE OUT OF RANGE': '⚠️',
  'Slight Rise': '↗',
  'Slight Fall': '↘',
  'Rise': '↑',
  'Fall': '↓',
  'Rapid Rise': '⇈',
  'Rapid Fall': '⇊'
};

interface Treatment {
  id: string;
  timestamp: string;
  type: string;
  glucoseValue?: number;
  carbsGrams?: number;
  insulinUnits?: number;
  insulinType?: string;
  notes?: string;
}

export default function ReadingsPage() {
  const { data: session } = useSession();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nightscoutUrl, setNightscoutUrl] = useState('');
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    return weekAgo.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [readings, setReadings] = useState<Reading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<Reading[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'nightscout'>('all');
  const [showData, setShowData] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'data'>('chart');
  const [statistics, setStatistics] = useState<Statistics>({
    estimatedA1C: 0,
    averageGlucose: 0,
    standardDeviation: 0,
    coefficientOfVariation: 0,
    gmi: 0,
    totalReadings: 0,
    timeInRange: 0,
    timeAboveRange: 0,
    timeBelowRange: 0,
    dailyPatterns: {
      overnight: 0,
      morning: 0,
      afternoon: 0,
      evening: 0
    },
  });
  const [settings, setSettings] = useState<Settings>({
    nightscoutUrl: '',
    lowGlucose: 70,
    highGlucose: 180,
  });
  const [stats, setStats] = useState<Statistics | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Add the missing fetchSettings function
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setNightscoutUrl(data.nightscoutUrl || '');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Automatic data loading on page load
  useEffect(() => {
    if (session) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        
        try {
          // First fetch settings
          await fetchSettings();
          
          // Fetch readings data (without automatic sync)
          await fetchReadings();
        } catch (error) {
          console.error('Error loading readings data:', error);
          setError('Failed to load readings data. Please try refreshing the page.');
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [session]);

  const fetchReadings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current settings to ensure we have the latest data
      const settingsRes = await fetch('/api/settings');
      const currentSettings = settingsRes.ok ? await settingsRes.json() : settings;
      
      const startDate = new Date(`${fromDate}T00:00:00.000Z`);
      const endDate = new Date(`${toDate}T23:59:59.999Z`);

      const source = currentSettings.nightscoutUrl ? 'combined' : 'manual';
      
      const url = new URL('/api/readings', window.location.origin);
      url.searchParams.set('startDate', startDate.getTime().toString());
      url.searchParams.set('endDate', endDate.getTime().toString());
      url.searchParams.set('source', source);
      url.searchParams.set('refresh', Date.now().toString());

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch readings from ${source} source`);
      }
      
      const data = await response.json();

      const filterReadings = (readings: any[]) => {
        return readings
          .map((reading: any) => ({
            sgv: reading.sgv,
            date: new Date(reading.date || reading.dateString).getTime(),
            direction: reading.direction,
            type: reading.type || 'sgv',
            source: reading.source || 'manual' as const
          }))
          .filter((reading: any) => 
            reading.sgv && 
            reading.sgv > 0 && 
            reading.date >= startDate.getTime() && 
            reading.date <= endDate.getTime()
          )
          .sort((a: any, b: any) => a.date - b.date);
      };

      const processedReadings = filterReadings(data);
      setReadings(processedReadings);
      setLastFetchTime(new Date());

    } catch (error) {
      console.error('Error fetching readings:', error);
      setError('Failed to fetch readings. Please check your settings and try again.');
    } finally {
      setLoading(false);
    }
  };

  const syncFromNightscout = async () => {
    if (settings.nightscoutUrl) {
      try {
        const response = await fetch('/api/nightscout/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: settings.nightscoutUrl }),
        });
        
        if (response.ok) {
          await fetchReadings();
        }
      } catch (error) {
        console.error('Error syncing from Nightscout:', error);
      }
    }
  };



  useEffect(() => {
    const filtered = readings.filter(reading => {
      if (sourceFilter === 'all') return true;
      return reading.source === sourceFilter;
    });
    setFilteredReadings(filtered);
    calculateStatistics(filtered);
  }, [readings, sourceFilter]);

  const calculateStatistics = (readings: Reading[]) => {
    if (readings.length === 0) return;

    const averageGlucose = readings.reduce((sum, reading) => sum + reading.sgv, 0) / readings.length;
    const squareDiffs = readings.map(reading => Math.pow(reading.sgv - averageGlucose, 2));
    const standardDeviation = Math.sqrt(squareDiffs.reduce((sum, diff) => sum + diff, 0) / readings.length);
    const coefficientOfVariation = (standardDeviation / averageGlucose) * 100;
    const estimatedA1C = parseFloat(((averageGlucose + 46.7) / 28.7).toFixed(1));
    const gmi = parseFloat((3.31 + (0.02392 * averageGlucose)).toFixed(1));

    // Use current settings for range calculations
    const inRange = readings.filter(r => r.sgv >= settings.lowGlucose && r.sgv <= settings.highGlucose).length;
    const aboveRange = readings.filter(r => r.sgv > settings.highGlucose).length;
    const belowRange = readings.filter(r => r.sgv < settings.lowGlucose).length;

    const dailyPatterns = readings.reduce((acc, reading) => {
      const hour = new Date(reading.date).getHours();
      if (hour >= 0 && hour < 6) acc.overnight += reading.sgv;
      else if (hour >= 6 && hour < 12) acc.morning += reading.sgv;
      else if (hour >= 12 && hour < 18) acc.afternoon += reading.sgv;
      else acc.evening += reading.sgv;
      return acc;
    }, { overnight: 0, morning: 0, afternoon: 0, evening: 0 });

    const patternCounts = readings.reduce((acc, reading) => {
      const hour = new Date(reading.date).getHours();
      if (hour >= 0 && hour < 6) acc.overnight++;
      else if (hour >= 6 && hour < 12) acc.morning++;
      else if (hour >= 12 && hour < 18) acc.afternoon++;
      else acc.evening++;
      return acc;
    }, { overnight: 0, morning: 0, afternoon: 0, evening: 0 });

    setStatistics({
      estimatedA1C,
      averageGlucose: Math.round(averageGlucose),
      standardDeviation: Math.round(standardDeviation),
      coefficientOfVariation: Math.round(coefficientOfVariation),
      gmi,
      totalReadings: readings.length,
      timeInRange: Math.round((inRange / readings.length) * 100),
      timeAboveRange: Math.round((aboveRange / readings.length) * 100),
      timeBelowRange: Math.round((belowRange / readings.length) * 100),
      dailyPatterns: {
        overnight: Math.round(dailyPatterns.overnight / (patternCounts.overnight || 1)),
        morning: Math.round(dailyPatterns.morning / (patternCounts.morning || 1)),
        afternoon: Math.round(dailyPatterns.afternoon / (patternCounts.afternoon || 1)),
        evening: Math.round(dailyPatterns.evening / (patternCounts.evening || 1))
      }
    });
  };

  // Add the missing formatRelativeTime function
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  // Chart data and options
  const groupReadingsByDay = (readings: Reading[], uniqueDays: string[]): { [key: string]: Reading[] } => {
    const grouped: { [key: string]: Reading[] } = {};
    
    uniqueDays.forEach(day => {
      grouped[day] = readings.filter(reading => {
        const readingDay = new Date(reading.date).toDateString();
        return readingDay === new Date(day).toDateString();
      });
    });
    
    return grouped;
  };

  const generateDayColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.508) % 360;
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
  };

  const uniqueDays = Array.from(new Set(filteredReadings.map(reading => 
    new Date(reading.date).toDateString()
  ))).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const groupedReadings = groupReadingsByDay(filteredReadings, uniqueDays);
  const dayColors = generateDayColors(uniqueDays.length);

  const datasets: ChartDataset<"line", (number | Point | null)[]>[] = uniqueDays.map((day, index) => {
    const dayReadings = groupedReadings[day] || [];
    const dayLabel = new Date(day).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: new Date(day).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });

    return {
      label: dayLabel,
      data: dayReadings.map(reading => {
        const readingDate = new Date(reading.date);
        const hours = readingDate.getHours();
        const minutes = readingDate.getMinutes();
        const timeOfDay = hours + (minutes / 60); // Convert to decimal hours
        
        return {
          x: timeOfDay,
          y: reading.sgv,
          direction: reading.direction
        };
      }),
      borderColor: dayColors[index],
      backgroundColor: dayColors[index] + '20',
      tension: 0.1,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });

  const chartData: ChartData<"line", (number | Point | null)[], unknown> = { datasets };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: true,
        text: 'Blood Glucose Readings Over Time'
      },
      tooltip: {
        mode: 'point',
        intersect: false,
        callbacks: {
          title: (context: any) => {
            if (context[0]?.raw) {
              const dataPoint = context[0].raw;
              const dataset = context[0].dataset;
              const dayLabel = dataset.label;
              
              if (typeof dataPoint.x === 'number') {
                const hours = Math.floor(dataPoint.x);
                const minutes = Math.round((dataPoint.x - hours) * 60);
                const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                return `${dayLabel} ${timeString}`;
              }
            }
          },
          label: (context: any) => {
            const value = context.parsed.y;
            const dataPoint = context.raw;
            const direction = dataPoint.direction;
            const arrow = direction ? DIRECTION_ARROWS[direction] || direction : '';
            return `${value} mg/dL ${arrow}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        min: 0,
        max: 24,
        ticks: {
          stepSize: 0.5, // 30-minute intervals
          callback: function(value: any) {
            const hours = Math.floor(value);
            const minutes = (value - hours) * 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
        },
        title: {
          display: true,
          text: 'Time of Day'
        }
      },
      y: {
        beginAtZero: false,
        min: 50,
        title: {
          display: true,
          text: 'Blood Glucose (mg/dL)'
        },
        grid: {
          color: (context) => {
            const value = context.tick.value as number;
            if (value === settings.lowGlucose || value === settings.highGlucose) {
              return '#ef4444';
            }
            return 'rgba(0, 0, 0, 0.1)';
          }
        }
      }
    },
    interaction: {
      mode: 'point',
      intersect: false,
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-stone-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-slate-600">Please sign in to view your readings and analysis.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-stone-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Loading Blood Glucose Data...</h1>
          <p className="mt-2 text-slate-600">Fetching your latest readings and statistics.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-stone-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Get current glucose value (most recent reading)
  const getCurrentGlucose = () => {
    if (!readings.length) return null;
    
    // Sort readings by date and get the most recent one
    const sortedReadings = [...readings].sort((a, b) => b.date - a.date);
    const currentReading = sortedReadings[0];
    
    return {
      value: currentReading.sgv,
      direction: currentReading.direction || 'NONE',
      timestamp: new Date(currentReading.date),
      source: currentReading.source
    };
  };

  const currentGlucose = getCurrentGlucose();

  // CSV Export function
  const exportToCSV = () => {
    if (filteredReadings.length === 0) return;

    // Create CSV content
    const csvHeaders = ['Date', 'Time', 'Glucose (mg/dL)', 'Direction', 'Source'];
    const csvRows = filteredReadings
      .sort((a, b) => b.date - a.date) // Sort by date descending
      .map(reading => [
        new Date(reading.date).toLocaleDateString(),
        new Date(reading.date).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        }),
        reading.sgv.toString(),
        reading.direction || '',
        reading.source || 'unknown'
      ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `glucose-readings-${fromDate}-to-${toDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blood Glucose Data</h1>
      </div>

      {/* Combined Current Status and Date Range Card */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Current Glucose Section */}
              {currentGlucose ? (
                <div className="flex items-center space-x-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Glucose</h2>
                    <div className="flex items-center space-x-3">
                      <span className={`text-4xl font-bold px-4 py-2 rounded-lg ${
                        currentGlucose.value < settings.lowGlucose ? 'bg-red-100 text-red-700' :
                        currentGlucose.value > settings.highGlucose ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {currentGlucose.value}
                      </span>
                      <span className="text-2xl">
                        {DIRECTION_ARROWS[currentGlucose.direction] || '→'}
                      </span>
                    </div>
                    {currentGlucose.timestamp && (
                      <p className="text-sm text-gray-600 mt-2">
                        Last updated {formatRelativeTime(currentGlucose.timestamp.toISOString())}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Date Range</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                      <div className="flex space-x-4">
                        <div>
                          <label className="block text-xs text-gray-500">From</label>
                          <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">To</label>
                          <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end space-x-4">
                      {readings.length > 0 && (
                        <div className="text-sm text-gray-500">
                          <p>Last updated</p>
                          <p>{lastFetchTime ? formatRelativeTime(lastFetchTime.toISOString()) : 'Never'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Date Range and Sync Controls */}
            <div className="flex items-center space-x-6">
              {/* Date Range Controls */}
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              
              {/* Last Updated Info */}
              {readings.length > 0 && (
                <div className="text-sm text-gray-500">
                  <p>Last updated</p>
                  <p>{lastFetchTime ? formatRelativeTime(lastFetchTime.toISOString()) : 'Never'}</p>
                </div>
              )}
              
              {/* Sync Button */}
              {settings.nightscoutUrl && (
                <button
                  onClick={syncFromNightscout}
                  disabled={syncing}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? (
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
      
      {/* Nightscout Information Message */}
      {!settings.nightscoutUrl && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-blue-900 font-semibold text-lg mb-2">Manual Mode Active 📊</h3>
              <p className="text-blue-800 mb-3">
                You're currently viewing manually entered glucose readings. This is perfect for tracking your data when you don't have real-time CGM/pump data available.
              </p>
              <div className="bg-blue-100 rounded-lg p-4 mb-3">
                <h4 className="text-blue-900 font-medium mb-2">To enhance your experience:</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• <strong>Set up Nightscout</strong> for automatic real-time data sync</li>
                  <li>• <strong>Continue manual entry</strong> for readings and treatments</li>
                  <li>• <strong>View your data</strong> in charts and statistics below</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <a 
                  href="/diabetes-profile" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configure Settings
                </a>
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




      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('chart')}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-semibold text-base transition-colors ${
                activeTab === 'chart'
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Chart View
              </div>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-semibold text-base transition-colors ${
                activeTab === 'data'
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Raw Data
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Statistics Section - Always visible */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Statistics ({filteredReadings.length} readings)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Estimated A1C</p>
            <p className="text-lg font-bold text-purple-700">{statistics.estimatedA1C}%</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
            <p className="text-sm text-indigo-600 font-medium">GMI</p>
            <p className="text-lg font-bold text-indigo-700">{statistics.gmi}%</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Average Glucose</p>
            <p className="text-lg font-bold text-blue-700">{statistics.averageGlucose} mg/dL</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Standard Deviation</p>
            <p className="text-lg font-bold text-gray-700">{statistics.standardDeviation} mg/dL</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 font-medium">Coefficient of Variation</p>
            <p className="text-lg font-bold text-slate-700">{statistics.coefficientOfVariation}%</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg border border-cyan-200">
            <p className="text-sm text-cyan-600 font-medium">Total Readings</p>
            <p className="text-lg font-bold text-cyan-700">{statistics.totalReadings}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Time in Range</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <p className="text-sm text-red-600 font-medium">Below</p>
              <p className="text-xl font-bold text-red-700">{statistics.timeBelowRange}%</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium">In Range</p>
              <p className="text-xl font-bold text-green-700">{statistics.timeInRange}%</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-600 font-medium">Above</p>
              <p className="text-xl font-bold text-orange-700">{statistics.timeAboveRange}%</p>
            </div>
          </div>
        </div>
        </div>

          {/* Tab Content */}
          {activeTab === 'chart' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Glucose Chart</h3>
              <div className="h-[500px]">
                <Line options={chartOptions} data={chartData} />
        </div>
            </div>
          )}
        
          {activeTab === 'data' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Raw Data</h3>
                <button
                  onClick={exportToCSV}
                  disabled={filteredReadings.length === 0}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to CSV
                </button>
              </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Glucose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Direction</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                    {[...filteredReadings].sort((a, b) => b.date - a.date).map((reading, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <div>
                            <div className="font-medium">{new Date(reading.date).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-400">
                              {new Date(reading.date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false 
                              })}
                            </div>
                          </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {reading.sgv} mg/dL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {reading.direction ? DIRECTION_ARROWS[reading.direction] || reading.direction : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
} 