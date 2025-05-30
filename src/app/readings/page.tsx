'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  originalDate?: number; // For preserving original date in overlay mode
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
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [readings, setReadings] = useState<Reading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<Reading[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'nightscout'>('all');
  const [showData, setShowData] = useState(false);
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

  useEffect(() => {
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

    if (session) {
      fetchSettings();
    }
  }, [session]);

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

    // Calculate average glucose
    const averageGlucose = readings.reduce((sum, reading) => sum + reading.sgv, 0) / readings.length;
    
    // Calculate standard deviation
    const squareDiffs = readings.map(reading => Math.pow(reading.sgv - averageGlucose, 2));
    const standardDeviation = Math.sqrt(squareDiffs.reduce((sum, diff) => sum + diff, 0) / readings.length);
    
    // Calculate coefficient of variation (CV)
    const coefficientOfVariation = (standardDeviation / averageGlucose) * 100;
    
    // Calculate estimated A1C using the formula: A1C = (average glucose + 46.7) / 28.7
    const estimatedA1C = parseFloat(((averageGlucose + 46.7) / 28.7).toFixed(1));
    
    // Calculate GMI (Glucose Management Indicator)
    // Formula: GMI = 3.31 + (0.02392 × mean glucose)
    const gmi = parseFloat((3.31 + (0.02392 * averageGlucose)).toFixed(1));

    // Calculate time in range percentages
    const inRange = readings.filter(r => r.sgv >= settings.lowGlucose && r.sgv <= settings.highGlucose).length;
    const aboveRange = readings.filter(r => r.sgv > settings.highGlucose).length;
    const belowRange = readings.filter(r => r.sgv < settings.lowGlucose).length;

    // Calculate daily patterns
    const dailyPatterns = readings.reduce((acc, reading) => {
      const hour = new Date(reading.date).getHours();
      if (hour >= 0 && hour < 6) acc.overnight += reading.sgv;
      else if (hour >= 6 && hour < 12) acc.morning += reading.sgv;
      else if (hour >= 12 && hour < 18) acc.afternoon += reading.sgv;
      else acc.evening += reading.sgv;
      return acc;
    }, { overnight: 0, morning: 0, afternoon: 0, evening: 0 });

    // Count readings in each period for averaging
    const periodCounts = readings.reduce((acc, reading) => {
      const hour = new Date(reading.date).getHours();
      if (hour >= 0 && hour < 6) acc.overnight++;
      else if (hour >= 6 && hour < 12) acc.morning++;
      else if (hour >= 12 && hour < 18) acc.afternoon++;
      else acc.evening++;
      return acc;
    }, { overnight: 0, morning: 0, afternoon: 0, evening: 0 });

    // Calculate averages for each period
    Object.keys(dailyPatterns).forEach(key => {
      dailyPatterns[key as keyof typeof dailyPatterns] = periodCounts[key as keyof typeof periodCounts] > 0
        ? Math.round(dailyPatterns[key as keyof typeof dailyPatterns] / periodCounts[key as keyof typeof periodCounts])
        : 0;
    });

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
      dailyPatterns,
    });
  };

  const fetchAllReadings = async (startDate: Date, endDate: Date) => {
    try {
      // Fetch readings from our database first
      const url = new URL('/api/readings', window.location.origin);
      url.searchParams.set('startDate', startDate.getTime().toString());
      url.searchParams.set('endDate', endDate.getTime().toString());
      url.searchParams.set('source', 'combined');
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch local readings');
      }

      const dbReadings = await response.json();
      
      // Fetch manual treatments (blood glucose readings)
      const treatmentsUrl = new URL('/api/treatments', window.location.origin);
      treatmentsUrl.searchParams.set('startDate', startDate.getTime().toString());
      treatmentsUrl.searchParams.set('endDate', endDate.getTime().toString());
      
      const treatmentsResponse = await fetch(treatmentsUrl);
      if (!treatmentsResponse.ok) {
        throw new Error('Failed to fetch treatments');
      }

      const treatments = await treatmentsResponse.json();
      
      // Filter treatments to include only blood glucose readings and ensure valid dates
      const bgTreatments = treatments
        .filter((t: any) => t.type === 'bg' && t.glucoseValue && t.timestamp)
        .map((t: any) => {
          const timestamp = new Date(t.timestamp);
          if (isNaN(timestamp.getTime())) {
            console.error('Invalid timestamp in treatment:', t);
            return null;
          }
          return {
            sgv: t.glucoseValue,
            date: timestamp.getTime(),
            direction: null,
            type: 'sgv',
            source: 'manual'
          };
        })
        .filter((t: any) => t !== null); // Remove any entries with invalid dates

      // Transform database readings to match our Reading type and ensure valid dates
      const formattedReadings = dbReadings
        .filter((reading: any) => reading.date)
        .map((reading: any) => {
          const timestamp = new Date(reading.date);
          if (isNaN(timestamp.getTime())) {
            console.error('Invalid date in reading:', reading);
            return null;
          }
          return {
            sgv: reading.sgv,
            date: timestamp.getTime(),
            direction: reading.direction,
            type: 'sgv',
            source: reading.source
          };
        })
        .filter((r: any) => r !== null); // Remove any entries with invalid dates

      // Combine and sort all readings by date (newest first)
      const allReadings = [...formattedReadings, ...bgTreatments]
        .sort((a, b) => b.date - a.date);

      return allReadings;
    } catch (error) {
      console.error('Error fetching readings:', error);
      throw error;
    }
  };

  const fetchReadings = async () => {
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      let endDate = new Date(now.getTime());
      let startDate: Date;
      
      if (fromDate && toDate) {
        // Create dates in local timezone for proper inclusive behavior
        startDate = new Date(fromDate + 'T00:00:00'); // Start of the from date in local time
        endDate = new Date(toDate + 'T23:59:59.999'); // End of the to date in local time
      } else if (fromDate) {
        startDate = new Date(fromDate + 'T00:00:00');
        endDate = new Date(fromDate + 'T23:59:59.999');
      } else {
        // Fallback to today
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        startDate = new Date(todayStr + 'T00:00:00');
        endDate = new Date(todayStr + 'T23:59:59.999');
      }

      console.log(`Date range calculation for ${fromDate} to ${toDate}:`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startDateLocal: startDate.toLocaleString(),
        endDateLocal: endDate.toLocaleString()
      });

      // Fetch all readings first
      const allReadings = await fetchAllReadings(startDate, endDate);
      
      // Apply client-side filtering for exact time windows
      const filterReadings = (readings: any[]) => {
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        return readings.filter(reading => 
          reading.date >= startTime && reading.date <= endTime
        );
      };
      
      // If we have a Nightscout URL, fetch and store new readings
      if (nightscoutUrl) {
        try {
          const nsUrl = new URL('/api/nightscout', window.location.origin);
          nsUrl.searchParams.set('startDate', startDate.getTime().toString());
          nsUrl.searchParams.set('endDate', endDate.getTime().toString());
          
          const nsResponse = await fetch(nsUrl);
          if (!nsResponse.ok) {
            const errorText = await nsResponse.text();
            throw new Error(`Failed to fetch Nightscout readings: ${errorText}`);
          }

          // Store new Nightscout readings
          const nsData = await nsResponse.json();
          if (Array.isArray(nsData) && nsData.length > 0) {
            await fetch('/api/readings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ readings: nsData }),
            });
            
            // Fetch updated readings after storing new ones
            const updatedReadings = await fetchAllReadings(startDate, endDate);
            setReadings(filterReadings(updatedReadings));
          } else {
            setReadings(filterReadings(allReadings));
          }
        } catch (nsError) {
          console.error('Error fetching Nightscout data:', nsError);
          // Still show local readings even if Nightscout fetch fails
          setReadings(filterReadings(allReadings));
        }
      } else {
        setReadings(filterReadings(allReadings));
      }
    } catch (error) {
      setError('Failed to fetch readings');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to group readings by day
  const groupReadingsByDay = (readings: Reading[], uniqueDays: string[]): { [key: string]: Reading[] } => {
    const days: { [key: string]: Reading[] } = {};
    
    readings.forEach(reading => {
      const date = new Date(reading.date);
      // Use local timezone date instead of UTC to avoid timezone shifts
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dayKey = `${year}-${month}-${day}`;
      
      if (!days[dayKey]) {
        days[dayKey] = [];
      }

      // For overlay mode, normalize all readings to the same reference day (2000-01-01)
      // but add a tiny millisecond offset for each day to keep datasets separate
      const dayIndex = uniqueDays.indexOf(dayKey);
      const refDate = new Date(2000, 0, 1); // Always use 2000-01-01 as base
      refDate.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), dayIndex); // Use dayIndex as milliseconds
      
      days[dayKey].push({
        ...reading,
        date: refDate.getTime(),
        originalDate: reading.date // Preserve original date for tooltip
      });
    });

    // Sort each day's readings by time and add gaps to prevent day boundary connections
    Object.keys(days).forEach(dayKey => {
      days[dayKey] = days[dayKey]
        .sort((a, b) => a.date - b.date)
        .map((reading, index, arr) => {
          // If this is not the first reading, check for large time gaps
          if (index > 0) {
            const timeDiff = reading.date - arr[index - 1].date;
            // If gap is more than 2 hours, insert a null reading to break the line
            if (timeDiff > 2 * 60 * 60 * 1000) {
              return [
                {
                  ...reading,
                  sgv: null as any, // null value creates gap in Chart.js
                  date: arr[index - 1].date + (timeDiff / 2),
                  originalDate: (arr[index - 1].originalDate || arr[index - 1].date) + (timeDiff / 2)
                },
                reading
              ];
            }
          }
          return reading;
        })
        .flat();
    });

    console.log('Grouped readings by day:', Object.keys(days).map(day => ({
      day,
      count: days[day].length
    })));

    return days;
  };

  // Generate different colors for each day
  const generateDayColors = (count: number) => {
    const colors = [
      'rgb(75, 192, 192)',   // teal
      'rgb(255, 99, 132)',   // red
      'rgb(54, 162, 235)',   // blue
      'rgb(255, 206, 86)',   // yellow
      'rgb(153, 102, 255)',  // purple
      'rgb(255, 159, 64)',   // orange
      'rgb(75, 192, 100)',   // green
    ];
    
    return Array(count).fill(0).map((_, i) => colors[i % colors.length]);
  };

  // Always use overlay mode to show all data on the same 24-hour timeline
  const useActualTimeline = false; // Always false to force overlay mode
  
  // Calculate unique days first for consistent color assignment
  const uniqueDays = Array.from(new Set(filteredReadings.map(reading => {
    const date = new Date(reading.date);
    // Use local timezone date instead of UTC to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }))).sort();
  
  // Calculate day groups for overlay mode
  const dayGroups = groupReadingsByDay(filteredReadings, uniqueDays);
  const dayCount = Object.keys(dayGroups).length;
  
  // Debug: Log the grouping results
  console.log('Day grouping debug:', {
    dayGroups: Object.keys(dayGroups).map(day => ({
      day,
      count: dayGroups[day].length,
      firstReading: dayGroups[day][0] ? {
        originalDate: new Date(dayGroups[day][0].originalDate || dayGroups[day][0].date).toISOString(),
        normalizedDate: new Date(dayGroups[day][0].date).toISOString(),
        sgv: dayGroups[day][0].sgv
      } : null,
      lastReading: dayGroups[day][dayGroups[day].length - 1] ? {
        originalDate: new Date(dayGroups[day][dayGroups[day].length - 1].originalDate || dayGroups[day][dayGroups[day].length - 1].date).toISOString(),
        normalizedDate: new Date(dayGroups[day][dayGroups[day].length - 1].date).toISOString(),
        sgv: dayGroups[day][dayGroups[day].length - 1].sgv
      } : null
    }))
  });
  
  // Debug: Log filtered readings to understand what's being charted
  console.log('Chart data debug:', {
    fromDate,
    toDate,
    useActualTimeline,
    filteredReadingsCount: filteredReadings.length,
    dayCount,
    filteredReadingsSample: filteredReadings.slice(0, 3).map(r => ({
      sgv: r.sgv,
      date: new Date(r.date).toISOString(),
      source: r.source
    }))
  });
  
  // Generate colors for each day
  const dayColors = generateDayColors(dayCount);
  
  const chartDatasets = (Object.entries(dayGroups) as [string, Reading[]][]).map(([day, dayReadings], index) => {
    // Use the day's position in the sorted uniqueDays array for consistent coloring
    const dayIndex = uniqueDays.indexOf(day);
    const dataset = {
      label: new Date(day + 'T00:00:00').toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      data: dayReadings.map(reading => ({
        x: reading.date as number,
        y: reading.sgv === null ? null : reading.sgv, // Preserve null values for gaps
        originalDate: reading.originalDate || reading.date, // Include original date for tooltip
        direction: reading.direction, // Include direction for tooltip
        dayKey: day // Include day key for tooltip
      })).sort((a, b) => (a.x as number) - (b.x as number)),
      borderColor: dayColors[dayIndex], // Use dayIndex from sorted array
      backgroundColor: dayColors[dayIndex], // Use dayIndex from sorted array
      tension: 0.1,
      pointRadius: 2,
      spanGaps: false, // This is key - don't span gaps created by null values
      segment: {
        // Add explicit segment styling to handle gaps better
        borderColor: (ctx: any) => {
          return ctx.p0.parsed.y === null || ctx.p1.parsed.y === null ? 'transparent' : undefined;
        }
      }
    };
    
    // Debug: Log each dataset
    console.log(`Dataset ${index} (${day}):`, {
      label: dataset.label,
      dayIndex,
      color: dayColors[dayIndex],
      dataCount: dataset.data.length,
      firstPoint: dataset.data[0],
      lastPoint: dataset.data[dataset.data.length - 1]
    });
    
    return dataset;
  });

  const chartData: ChartData<'line'> = {
    datasets: [
      // Range limit lines
      {
        label: 'High Limit',
        data: [
          { x: new Date(2000, 0, 1, 0, 0, 0, 0).getTime(), y: settings.highGlucose },
          { x: new Date(2000, 0, 1, 23, 59, 59, 999).getTime(), y: settings.highGlucose }
        ],
        borderColor: 'rgba(255, 0, 0, 0.5)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0
      },
      {
        label: 'Low Limit',
        data: [
          { x: new Date(2000, 0, 1, 0, 0, 0, 0).getTime(), y: settings.lowGlucose },
          { x: new Date(2000, 0, 1, 23, 59, 59, 999).getTime(), y: settings.lowGlucose }
        ],
        borderColor: 'rgba(255, 0, 0, 0.5)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0
      },
      // Glucose readings
      ...chartDatasets
    ] as ChartDataset<'line', Point[]>[]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          },
          tooltipFormat: 'HH:mm'
        },
        // Always use 00:00-24:00 range for consistent day view
        min: new Date(2000, 0, 1, 0, 0, 0, 0).getTime(), // 2000-01-01 00:00:00
        max: new Date(2000, 0, 1, 23, 59, 59, 999).getTime(), // 2000-01-01 23:59:59
        title: {
          display: true,
          text: useActualTimeline 
            ? `${new Date(fromDate).toLocaleDateString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`
            : `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`
        },
        ticks: {
          source: 'auto',
          autoSkip: false,
          maxRotation: 0,
          maxTicksLimit: 49, // 24 hours * 2 (30-min intervals) + 1
          callback: function(value) {
            const date = new Date(value);
            const hour = date.getHours();
            const minute = date.getMinutes();
            // Only show ticks at 30-minute intervals
            if (minute === 0 || minute === 30) {
              return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            }
            return '';
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Blood Glucose (mg/dL)'
        },
        min: 40,
        max: 400,
        grid: {
          color: (context) => {
            if (context.tick.value === settings.highGlucose) return 'rgba(255, 0, 0, 0.2)';
            if (context.tick.value === settings.lowGlucose) return 'rgba(255, 0, 0, 0.2)';
            return '#e5e5e5';
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            if (!context.length) return '';
            const dataPoint = context[0].raw;
            const dayLabel = context[0].dataset.label || '';
            
            if (useActualTimeline) {
              // For timeline view, show full date and time
              const date = new Date(dataPoint.x as number);
              const localDate = date.toLocaleDateString();
              const localTime = date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              });
              return `${localDate} ${localTime}`;
            } else {
              // For overlay view, show the actual date from the original reading
              if (dataPoint.originalDate) {
                const originalDate = new Date(dataPoint.originalDate);
                const localDate = originalDate.toLocaleDateString();
                const localTime = originalDate.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
                return `${localDate} ${localTime}`;
              } else {
                // Fallback to day label and normalized time
                const dateForTime = new Date(dataPoint.x as number);
                const localTime = dateForTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
                return `${dayLabel} ${localTime}`;
              }
            }
          },
          label: (context: any) => {
            const value = context.parsed.y;
            const dataPoint = context.raw;
            // Use direction directly from data point
            const direction = dataPoint.direction;
            const arrow = direction ? DIRECTION_ARROWS[direction] || direction : '';
            return `${value} mg/dL ${arrow}`;
          }
        }
      }
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Please sign in to view your readings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          <p className="mt-2 text-gray-600">Fetching your readings data.</p>
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
      <h1 className="text-3xl font-bold mb-8">Blood Glucose Readings</h1>
      
      {/* Data Source Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Source</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nightscout URL</label>
            <input
              type="text"
              value={nightscoutUrl}
              onChange={(e) => setNightscoutUrl(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="https://your-site.herokuapp.com"
            />
          </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Filter Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'all' | 'manual' | 'nightscout')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual Entries</option>
              <option value="nightscout">Nightscout</option>
            </select>
          </div>
        </div>
        <button
          onClick={fetchReadings}
          className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Fetch Readings
        </button>
      </div>

      {/* Statistics Section */}
      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Statistics</h2>
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

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Daily Patterns</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm text-gray-500">Overnight (00:00-06:00)</p>
              <p className="font-semibold">{statistics.dailyPatterns.overnight} mg/dL</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Morning (06:00-12:00)</p>
              <p className="font-semibold">{statistics.dailyPatterns.morning} mg/dL</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Afternoon (12:00-18:00)</p>
              <p className="font-semibold">{statistics.dailyPatterns.afternoon} mg/dL</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Evening (18:00-24:00)</p>
              <p className="font-semibold">{statistics.dailyPatterns.evening} mg/dL</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <div className="h-[500px]">
          <Line options={chartOptions} data={chartData} />
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Raw Data</h2>
          <button
            onClick={() => setShowData(!showData)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {showData ? 'Hide Data' : 'Show Data'}
          </button>
        </div>
        
        {showData && (
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
                {filteredReadings.map((reading, index) => (
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
        )}
      </div>
    </div>
  );
} 