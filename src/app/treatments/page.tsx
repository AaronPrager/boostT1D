'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate, formatRelativeTime } from '@/lib/dashboardUtils';

export default function TreatmentsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [treatments, setTreatments] = useState<any[]>([]);
  const [filteredTreatments, setFilteredTreatments] = useState<any[]>([]);
  const [treatmentTypeFilter, setTreatmentTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [manualTreatment, setManualTreatment] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    type: 'Bolus',
    insulin: '',
    carbs: '',
    glucoseValue: '',
    notes: ''
  });

  // Fetch settings on component mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setIsManualMode(!data.nightscoutUrl || !data.nightscoutApiToken);
        }
      } catch (err) {
      }
    }
    fetchSettings();
  }, []);

  // Auto-fetch treatments for last week on page load
  useEffect(() => {
    fetchTreatments();
    // Auto-sync with Nightscout when page loads
    syncWithNightscout();
  }, []);

  async function fetchTreatments() {
    setLoading(true);
    setError(null);
    try {
      // Create start date at beginning of day (00:00:00)
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      
      // Create end date at end of day (23:59:59)
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      
      const res = await fetch(`/api/treatments?startDate=${startDateTime.getTime()}&endDate=${endDateTime.getTime()}`);
      if (!res.ok) {
        const errorText = await res.text();
        // Don't show error for configuration issues - they're handled by the manual mode section
        if (errorText.includes('not configured') || errorText.includes('API token')) {
          setTreatments([]);
          return;
        }
        throw new Error(errorText);
      }
      const data = await res.json();
      setTreatments(data.treatments || data);
      setLastFetchTime(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch treatments');
    } finally {
      setLoading(false);
    }
  }

  const syncWithNightscout = async () => {
    try {

      const response = await fetch('/api/nightscout/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {

        // Refresh treatments data after successful sync
        await fetchTreatments();
      } else {
        const errorText = await response.text();
        // Don't show error to user for auto-sync, just log it
      }
    } catch (error) {
      // Don't show error to user for auto-sync, just log it
    }
  };

  // Get unique treatment types for filter dropdown
  const getUniqueTreatmentTypes = () => {
    const types = treatments.map(t => t.eventType || t.type || 'Unknown').filter(Boolean);
    return [...new Set(types)].sort();
  };

  // Filter treatments based on selected type
  const filterTreatments = (treatments: any[], filter: string) => {
    if (filter === 'all') return treatments;
    return treatments.filter(t => (t.eventType || t.type || 'Unknown') === filter);
  };

  // Update filtered treatments when treatments or filter changes
  useEffect(() => {
    const filtered = filterTreatments(treatments, treatmentTypeFilter);
    setFilteredTreatments(filtered);
  }, [treatments, treatmentTypeFilter]);

  // CSV Export function for treatments
  const exportTreatmentsToCSV = () => {
    if (filteredTreatments.length === 0) return;

    // Create CSV content
    const csvHeaders = ['Date', 'Time', 'Event Type', 'Insulin', 'Carbs', 'Notes'];
    const csvRows = filteredTreatments.map(treatment => [
      (treatment.created_at ? new Date(treatment.created_at) : new Date(treatment.timestamp)).toLocaleDateString(),
      (treatment.created_at ? new Date(treatment.created_at) : new Date(treatment.timestamp)).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      }),
      treatment.eventType || treatment.type || '',
      (() => {
        const insulinValue = treatment.insulin || treatment.insulinUnits;
        if (insulinValue && !isNaN(parseFloat(insulinValue))) {
          return parseFloat(insulinValue).toFixed(2);
        }
        return '';
      })(),
      treatment.carbs || treatment.carbsGrams || '',
      treatment.notes || treatment.reason || ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `treatments-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function saveManualTreatment() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/treatments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: manualTreatment.timestamp,
          type: manualTreatment.type,
          insulin: manualTreatment.insulin ? parseFloat(manualTreatment.insulin) : undefined,
          carbs: manualTreatment.carbs ? parseFloat(manualTreatment.carbs) : undefined,
          glucoseValue: manualTreatment.glucoseValue ? parseFloat(manualTreatment.glucoseValue) : undefined,
          notes: manualTreatment.notes,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to save treatment');
      
      // Reset form and refresh treatments
      setManualTreatment({
        timestamp: new Date().toISOString().slice(0, 16),
        type: 'Bolus',
        insulin: '',
        carbs: '',
        glucoseValue: '',
        notes: ''
      });
      
      setShowManualEntry(false);
      
      // Refresh the treatments list
      await fetchTreatments();
      
    } catch (err: any) {
      setError(err.message || 'Failed to save treatment');
    } finally {
      setLoading(false);
    }
  }

  async function deleteTreatment(treatmentId: string) {
    if (!confirm('Are you sure you want to delete this treatment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/treatments/${treatmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {

        // Refresh treatments
        await fetchTreatments();
      } else {
        const errorData = await response.json();
        setError(`Failed to delete treatment: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setError('An error occurred while deleting the treatment.');
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Nightscout Treatments</h1>
      
      {/* Manual Mode Indicator Banner */}
      {isManualMode && (
        <div className="mb-6 bg-gradient-to-r from-orange-100 via-amber-50 to-yellow-100 border-2 border-orange-300 rounded-xl shadow-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-orange-900">Manual Mode Active</h3>
              <div className="mt-2 text-sm text-orange-800">
                <p>
                  {settings?.nightscoutUrl && !settings?.nightscoutApiToken 
                    ? "Nightscout URL is configured but API token is missing. You can manually enter treatments or add your API token in your Personal Profile to enable automatic syncing."
                    : "Nightscout is not configured. You can manually enter treatments or set up Nightscout for automatic sync with your CGM/pump."
                  }
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-md"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Treatment
                </button>
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

      {/* Manual Treatment Entry Form */}
      {showManualEntry && (
        <div className="mb-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800">Add Treatment Manually</h3>
            <button
              onClick={() => setShowManualEntry(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-white/50 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Date & Time Card */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={manualTreatment.timestamp}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, timestamp: e.target.value }))}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Treatment Type Card */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Treatment Type
              </label>
              <select
                value={manualTreatment.type}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors bg-white"
              >
                <option value="Bolus">Bolus</option>
                <option value="Meal">Meal</option>
                <option value="Correction">Correction</option>
                <option value="Snack">Snack</option>
                <option value="Exercise">Exercise</option>
                <option value="Note">Note</option>
                <option value="BG Check">BG Check</option>
              </select>
            </div>
            
            {/* Insulin & Carbs Cards - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Insulin <span className="text-xs font-normal text-slate-500">(Units)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={manualTreatment.insulin}
                  onChange={(e) => setManualTreatment(prev => ({ ...prev, insulin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                />
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Carbs <span className="text-xs font-normal text-slate-500">(Grams)</span>
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="0"
                  value={manualTreatment.carbs}
                  onChange={(e) => setManualTreatment(prev => ({ ...prev, carbs: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                />
              </div>
            </div>

            {/* Blood Glucose Card */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Blood Glucose <span className="text-xs font-normal text-slate-500">(mg/dL)</span>
              </label>
              <input
                type="number"
                step="1"
                placeholder="100"
                value={manualTreatment.glucoseValue}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, glucoseValue: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors"
              />
            </div>
            
            {/* Notes Card */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Notes
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes..."
                value={manualTreatment.notes}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={saveManualTreatment}
              disabled={loading}
              className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Treatment
                </>
              )}
            </button>
            <button
              onClick={() => {
                setManualTreatment({
                  timestamp: new Date().toISOString().slice(0, 16),
                  type: 'Bolus',
                  insulin: '',
                  carbs: '',
                  glucoseValue: '',
                  notes: ''
                });
              }}
              className="px-3 py-1.5 bg-white text-slate-700 text-sm font-semibold rounded-md border border-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear
            </button>
          </div>
        </div>
      )}
      
      {/* Filter and Date Range Section */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Filter Treatments</h3>
        <div className="space-y-4">
          {/* Date Range Card */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-800 mb-3">Date Range</label>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">From</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">To</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors" 
                  />
                </div>
              </div>
              
              {/* Quick Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Quick:</span>
                <button
                  onClick={() => {
                    const today = new Date();
                    setStartDate(formatDate(today));
                    setEndDate(formatDate(today));
                    setTreatmentTypeFilter('all');
                    fetchTreatments();
                  }}
                  className="px-2 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const today = new Date();
                    setStartDate(formatDate(yesterday));
                    setEndDate(formatDate(today));
                    setTreatmentTypeFilter('all');
                    fetchTreatments();
                  }}
                  className="px-2 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  Last 2 Days
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setStartDate(formatDate(d));
                    setEndDate(formatDate(new Date()));
                    setTreatmentTypeFilter('all');
                    fetchTreatments();
                  }}
                  className="px-2 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  Last Week
                </button>
              </div>
            </div>
          </div>
          
          {/* Treatment Type Filter Card */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-800 mb-2">Treatment Type</label>
            <select
              value={treatmentTypeFilter}
              onChange={(e) => setTreatmentTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors bg-white"
            >
              <option value="all">All Types</option>
              {getUniqueTreatmentTypes().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {/* Fetch Button Row */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            {lastFetchTime && (
              <div className="text-xs text-slate-600 order-2 sm:order-1">
                Last updated: <span className="font-medium">{formatRelativeTime(lastFetchTime.toISOString())}</span>
              </div>
            )}
            <button 
              onClick={fetchTreatments} 
              className="order-1 sm:order-2 inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Fetch Treatments
            </button>
          </div>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && (
        <div className="text-blue-600 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Configuration Required</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>{error}</p>
                  {error.includes('API token') && (
                    <div className="mt-3">
                      <a 
                        href="/diabetes-profile" 
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Configure Nightscout Settings
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {treatments.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Treatments Data</h3>
            <button
              onClick={exportTreatmentsToCSV}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
          </div>
          {/* Treatment Count */}
          <div className="mb-3 text-sm text-gray-600">
            Showing {filteredTreatments.length} of {treatments.length} treatments
            {treatmentTypeFilter !== 'all' && ` (filtered by ${treatmentTypeFilter})`}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Time</th>
                  <th className="border px-2 py-1">Event Type</th>
                  <th className="border px-2 py-1">Insulin</th>
                  <th className="border px-2 py-1">Carbs</th>
                  <th className="border px-2 py-1">Notes</th>
                  {isManualMode && <th className="border px-2 py-1">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTreatments.map((treatment, i) => (
                  <tr key={treatment._id || treatment.id || i}>
                    <td className="border px-2 py-1">
                      {treatment.created_at ? new Date(treatment.created_at).toLocaleString() : 
                       treatment.timestamp ? new Date(treatment.timestamp).toLocaleString() : ''}
                    </td>
                    <td className="border px-2 py-1">{treatment.eventType || treatment.type || ''}</td>
                    <td className="border px-2 py-1">
                      {(() => {
                        const insulinValue = treatment.insulin || treatment.insulinUnits;
                        if (insulinValue && !isNaN(parseFloat(insulinValue))) {
                          return parseFloat(insulinValue).toFixed(2);
                        }
                        return '';
                      })()}
                    </td>
                    <td className="border px-2 py-1">{treatment.carbs || treatment.carbsGrams || ''}</td>
                    <td className="border px-2 py-1">{treatment.notes || treatment.reason || ''}</td>
                    {isManualMode && (
                      <td className="border px-2 py-1">
                        {treatment.id && (
                          <button
                            onClick={() => deleteTreatment(treatment.id)}
                            className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium"
                            title="Delete treatment"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
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
              {filteredTreatments.length === 0 && !loading && (
                <div className="text-slate-500 mt-4">
                  {treatments.length === 0 
                    ? "No treatments found for this range." 
                    : `No treatments of type "${treatmentTypeFilter}" found.`}
                </div>
              )}
    </div>
  );
} 