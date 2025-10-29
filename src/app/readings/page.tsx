'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatRelativeTime } from '@/lib/dashboardUtils';
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
  id?: string;
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
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    return weekAgo.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    // Add one day to ensure we capture today's readings
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
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
  
  // Manual reading entry state
  const [showAddReading, setShowAddReading] = useState(false);
  const [newReading, setNewReading] = useState({
    value: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    direction: 'Flat'
  });

  // Add the missing fetchSettings function
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

  // Handle deleting a manual reading
  const handleDeleteReading = async (readingId: string) => {
    if (!confirm('Are you sure you want to delete this reading?')) {
      return;
    }

    try {
      const response = await fetch(`/api/readings/${readingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {

        // Refresh readings
        await fetchReadings();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete reading: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('An error occurred while deleting the reading.');
    }
  };

  // Handle adding a new manual reading
  const handleAddReading = async () => {
    try {
      const glucoseValue = parseInt(newReading.value);
      if (isNaN(glucoseValue) || glucoseValue < 20 || glucoseValue > 600) {
        alert('Please enter a valid glucose value between 20 and 600 mg/dL');
        return;
      }

      const timestamp = new Date(`${newReading.date}T${newReading.time}`);

      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readings: [{
            sgv: glucoseValue,
            date: timestamp.toISOString(),
            direction: newReading.direction,
            type: 'sgv',
            source: 'manual'
          }]
        }),
      });

      const result = await response.json();

      if (response.ok) {

        // Reset form
        setNewReading({
          value: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          direction: 'Flat'
        });
        setShowAddReading(false);
        // Refresh readings - wait a bit for the database to update
        setTimeout(async () => {
          await fetchReadings();
        }, 500);
      } else {
        alert(`Failed to save reading: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('An error occurred while saving the reading.');
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
            id: reading.id, // Preserve the ID for deletion
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
      }
    }
  };

  // Set source filter based on settings
  useEffect(() => {
    if (settings.nightscoutUrl) {
      setSourceFilter('nightscout');
    } else {
      setSourceFilter('manual');
    }
  }, [settings.nightscoutUrl]);

  useEffect(() => {
    const filtered = readings.filter(reading => {
      if (sourceFilter === 'all') return true;
      return reading.source === sourceFilter;
    });
    setFilteredReadings(filtered);
    calculateStatistics(filtered);
  }, [readings, sourceFilter]);

  const calculateStatistics = (readings: Reading[]) => {
    if (readings.length === 0) {
      // Reset statistics to default values when no readings
      setStatistics({
        averageGlucose: 0,
        standardDeviation: 0,
        coefficientOfVariation: 0,
        estimatedA1C: 0,
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
        }
      });
      return;
    }

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
          <h1 className="text-2xl font-bold text-blue-600">Error</h1>
          <p className="mt-2 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Get current glucose value (most recent reading)
  const getCurrentGlucose = () => {
    if (!readings.length) return null;
    
    // Sort readings by date
    const sortedReadings = [...readings].sort((a, b) => b.date - a.date);
    
    // In Nightscout mode, prioritize Nightscout readings over manual ones
    let currentReading, previousReading;
    
    if (settings.nightscoutUrl) {
      // Find the most recent Nightscout reading
      const nightscoutReadings = sortedReadings.filter(r => r.source === 'nightscout');
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
    
    return {
      value: currentReading.sgv,
      direction: currentReading.direction || 'NONE',
      timestamp: new Date(currentReading.date),
      source: currentReading.source,
      previousValue: previousReading?.sgv || null,
      difference: previousReading ? currentReading.sgv - previousReading.sgv : null
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
                        currentGlucose.value < settings.lowGlucose ? 'bg-blue-100 text-blue-700' :
                        currentGlucose.value > settings.highGlucose ? 'bg-indigo-100 text-indigo-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {currentGlucose.value}
                      </span>
                      <span className="text-2xl">
                        {DIRECTION_ARROWS[currentGlucose.direction] || '→'}
                      </span>
                    </div>
                    
                    {/* Measurement details */}
                    <div className="mt-2 space-y-1">
                      {currentGlucose.timestamp && (
                        <p className="text-sm text-gray-600">
                          Measured {formatRelativeTime(currentGlucose.timestamp.toISOString())}
                        </p>
                      )}
                      {currentGlucose.difference !== null && currentGlucose.previousValue && (
                        <p className="text-sm text-gray-600">
                          {currentGlucose.difference > 0 ? '+' : ''}{currentGlucose.difference} from {currentGlucose.previousValue} 
                          <span className="text-gray-500 ml-1">
                            ({currentGlucose.difference > 0 ? '↗' : currentGlucose.difference < 0 ? '↘' : '→'})
                          </span>
                        </p>
                      )}
                    </div>
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
      
      {/* Manual Mode - Add Reading Card */}
      {!settings.nightscoutUrl && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manual Mode</h2>
                  <p className="text-gray-600">Add and track your glucose readings manually</p>
                </div>
              </div>
              {!showAddReading && (
                <button
                  onClick={() => setShowAddReading(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Reading
                </button>
              )}
            </div>

            {/* Add Reading Form */}
            {showAddReading && (
              <div className="bg-white rounded-lg border-2 border-gray-300 p-4 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">New Glucose Reading</h3>
                  <button
                    onClick={() => setShowAddReading(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Glucose Value */}
                  <div className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Glucose Value (mg/dL)
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="600"
                      value={newReading.value}
                      onChange={e => setNewReading({ ...newReading, value: e.target.value })}
                      className="w-full border border-gray-400 rounded-md py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="100"
                    />
                  </div>

                  {/* Direction */}
                  <div className="border border-gray-300 rounded-md p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Trend Direction
                    </label>
                    <select
                      value={newReading.direction}
                      onChange={e => setNewReading({ ...newReading, direction: e.target.value })}
                      className="w-full border border-gray-400 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="DoubleDown">⇊ Double Down</option>
                      <option value="SingleDown">↓ Single Down</option>
                      <option value="FortyFiveDown">↘ Forty-Five Down</option>
                      <option value="Flat">→ Flat</option>
                      <option value="FortyFiveUp">↗ Forty-Five Up</option>
                      <option value="SingleUp">↑ Single Up</option>
                      <option value="DoubleUp">⇈ Double Up</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-green-50 to-emerald-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newReading.date}
                      onChange={e => setNewReading({ ...newReading, date: e.target.value })}
                      className="w-full border border-gray-400 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Time */}
                  <div className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-amber-50 to-yellow-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={newReading.time}
                      onChange={e => setNewReading({ ...newReading, time: e.target.value })}
                      className="w-full border border-gray-400 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowAddReading(false)}
                    className="px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddReading}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold text-sm"
                  >
                    Save Reading
                  </button>
                </div>
              </div>
            )}

            {/* Info Section */}
            {!showAddReading && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      <strong>Manual Mode:</strong> Track your glucose readings manually. For automatic syncing, configure Nightscout in your <a href="/personal-profile" className="text-blue-600 hover:underline">Personal Profile</a>.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Below</p>
              <p className="text-xl font-bold text-blue-700">{statistics.timeBelowRange}%</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">In Range</p>
              <p className="text-xl font-bold text-blue-700">{statistics.timeInRange}%</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-600 font-medium">Above</p>
              <p className="text-xl font-bold text-indigo-700">{statistics.timeAboveRange}%</p>
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
                  {!settings.nightscoutUrl && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  )}
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
                    {!settings.nightscoutUrl && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {reading.source === 'manual' && reading.id ? (
                          <button
                            onClick={() => {

                              handleDeleteReading(reading.id!);
                            }}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-xs font-medium"
                            title="Delete reading"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {reading.source === 'manual' ? 'No ID' : 'N/A'}
                          </span>
                        )}
                      </td>
                    )}
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