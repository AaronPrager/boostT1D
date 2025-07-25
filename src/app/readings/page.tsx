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
    } finally {
      setLoading(false);
    }
  };

  const fetchReadings = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date(`${fromDate}T00:00:00.000Z`);
      const endDate = new Date(`${toDate}T23:59:59.999Z`);

      const source = settings.nightscoutUrl ? 'combined' : 'manual';
      
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

  // On mount, fetch settings
  useEffect(() => {
    if (session) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // When settings.nightscoutUrl changes, sync or fetch readings
  useEffect(() => {
    if (!session) return;
    if (settings.nightscoutUrl) {
      syncFromNightscout();
    } else {
      fetchReadings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.nightscoutUrl]);

  useEffect(() => {
    const filtered = readings.filter(reading => {
      if (sourceFilter === 'all') return true;
      return reading.source === sourceFilter;
    });
    setFilteredReadings(filtered);
    calculateStatistics(filtered);
  }, [readings, sourceFilter, settings]);

  const calculateStatistics = (readings: Reading[]) => {
    if (readings.length === 0) return;

    const averageGlucose = readings.reduce((sum, reading) => sum + reading.sgv, 0) / readings.length;
    const squareDiffs = readings.map(reading => Math.pow(reading.sgv - averageGlucose, 2));
    const standardDeviation = Math.sqrt(squareDiffs.reduce((sum, diff) => sum + diff, 0) / readings.length);
    const coefficientOfVariation = (standardDeviation / averageGlucose) * 100;
    const estimatedA1C = parseFloat(((averageGlucose + 46.7) / 28.7).toFixed(1));
    const gmi = parseFloat((3.31 + (0.02392 * averageGlucose)).toFixed(1));

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Please sign in to view your readings and analysis.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          <p className="mt-2 text-gray-600">Fetching your data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blood Glucose Data</h1>
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

      {/* Date Range Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <div className="mt-1 flex space-x-4">
              <div>
                <label className="block text-xs text-gray-500">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
            <button
              onClick={fetchReadings}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('chart')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chart'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Chart View
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'data'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Raw Data
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Statistics Section - Always visible */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Statistics ({filteredReadings.length} readings)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Estimated A1C</p>
            <p className="text-lg font-semibold">{statistics.estimatedA1C}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">GMI</p>
            <p className="text-lg font-semibold">{statistics.gmi}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Average Glucose</p>
            <p className="text-lg font-semibold">{statistics.averageGlucose} mg/dL</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Standard Deviation</p>
            <p className="text-lg font-semibold">{statistics.standardDeviation} mg/dL</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Coefficient of Variation</p>
            <p className="text-lg font-semibold">{statistics.coefficientOfVariation}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Readings</p>
            <p className="text-lg font-semibold">{statistics.totalReadings}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Time in Range</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-red-100 rounded">
              <p className="text-sm text-red-800">Below</p>
              <p className="font-semibold">{statistics.timeBelowRange}%</p>
            </div>
            <div className="text-center p-2 bg-green-100 rounded">
              <p className="text-sm text-green-800">In Range</p>
              <p className="font-semibold">{statistics.timeInRange}%</p>
            </div>
            <div className="text-center p-2 bg-yellow-100 rounded">
              <p className="text-sm text-yellow-800">Above</p>
              <p className="font-semibold">{statistics.timeAboveRange}%</p>
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
              <h3 className="text-lg font-semibold mb-4">Raw Data</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Glucose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                    {[...filteredReadings].sort((a, b) => b.date - a.date).map((reading, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div className="font-medium">{new Date(reading.date).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(reading.date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false 
                              })}
                            </div>
                          </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reading.sgv} mg/dL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reading.direction ? DIRECTION_ARROWS[reading.direction] || reading.direction : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reading.source}
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