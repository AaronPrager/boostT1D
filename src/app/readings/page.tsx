'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type DateRange = '1' | '2' | '7' | '30';

type Reading = {
  sgv: number;
  date: number;
  direction?: string;
  type: string;
};

type Settings = {
  nightscoutUrl: string;
  lowGlucose: number;
  highGlucose: number;
  timeFormat: '12h' | '24h';
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
  'RATE OUT OF RANGE': '⚠️'
};

export default function ReadingsPage() {
  const [nightscoutUrl, setNightscoutUrl] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('7');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<Settings>({
    nightscoutUrl: '',
    lowGlucose: 70,
    highGlucose: 180,
    timeFormat: '12h'
  });

  // Fetch saved settings on component mount
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
      }
    };

    fetchSettings();
  }, []);

  const fetchReadings = async () => {
    if (!nightscoutUrl) {
      setError('Please enter your Nightscout URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const daysAgo = parseInt(dateRange);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Use our proxy API endpoint
      const url = new URL('/api/nightscout', window.location.origin);
      url.searchParams.set('url', nightscoutUrl.trim());
      url.searchParams.set('startDate', startDate.getTime().toString());
      url.searchParams.set('endDate', endDate.getTime().toString());
      
      console.log('Fetching readings through proxy:', url.toString());

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);

      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

      if (data.length === 0) {
        setError('No readings found for the selected date range');
        setReadings([]);
        return;
      }

      setReadings(data);
    } catch (error) {
      console.error('Detailed fetch error:', error);
      if (error instanceof Error) {
        setError(`Error: ${error.message}`);
      } else {
        setError('Error fetching readings. Please check your Nightscout URL and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: settings.timeFormat === '12h'
    };
    return date.toLocaleString(undefined, options);
  };

  const getDirectionArrow = (direction: string | undefined) => {
    if (!direction) return '⟷';
    return DIRECTION_ARROWS[direction] || direction;
  };

  const getGlucoseClass = (glucose: number) => {
    if (glucose < settings.lowGlucose) return 'text-red-600 font-bold';
    if (glucose > settings.highGlucose) return 'text-yellow-600 font-bold';
    return 'text-green-600';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchReadings();
  };

  // Function to validate Nightscout URL format
  const validateUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Handle URL change with validation
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setNightscoutUrl(url);
    if (url && !validateUrl(url)) {
      setError('Please enter a valid URL starting with http:// or https://');
    } else {
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nightscout Readings</h2>

            <form onSubmit={handleSubmit} className="space-y-6 mb-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="nightscoutUrl" className="block text-sm font-medium text-gray-700">
                    Nightscout URL
                  </label>
                  <input
                    type="url"
                    id="nightscoutUrl"
                    value={nightscoutUrl}
                    onChange={handleUrlChange}
                    placeholder="https://your-site.herokuapp.com"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Example: https://your-site.herokuapp.com (no trailing slash)
                  </p>
                </div>

                <div>
                  <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
                    Date Range
                  </label>
                  <select
                    id="dateRange"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRange)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="1">Last 24 Hours</option>
                    <option value="2">Last 2 Days</option>
                    <option value="7">Last Week</option>
                    <option value="30">Last Month</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !validateUrl(nightscoutUrl)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Fetch Readings'}
                </button>
              </div>
            </form>

            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {readings.length > 0 && (
              <div className="mt-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date/Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Blood Glucose
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {readings.map((reading, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(reading.date)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getGlucoseClass(reading.sgv)}`}>
                          {reading.sgv} mg/dL
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-2xl">
                          {getDirectionArrow(reading.direction)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 