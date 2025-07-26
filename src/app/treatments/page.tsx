'use client';

import { useState, useEffect } from 'react';

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function TreatmentsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
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
        console.error('Failed to fetch settings:', err);
      }
    }
    fetchSettings();
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
    } catch (err: any) {
      setError(err.message || 'Failed to fetch treatments');
    } finally {
      setLoading(false);
    }
  }

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
      
      // Refresh the treatments list
      await fetchTreatments();
      
    } catch (err: any) {
      setError(err.message || 'Failed to save treatment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Nightscout Treatments</h1>
      
              {/* Manual Mode Section - Show when Nightscout is not configured */}
        {isManualMode && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gray-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-gray-900 font-medium text-base mb-2">Manual Mode Active 💊</h3>
                <p className="text-gray-600 text-sm mb-3">
                  {settings.nightscoutUrl && !settings.nightscoutApiToken 
                    ? "Nightscout URL is configured but API token is missing. You can continue in manual mode or add your API token."
                    : "Nightscout is not configured. You can continue in manual mode or set up Nightscout for automatic sync."
                  }
                </p>
                <div className="flex flex-wrap gap-2">
                  <a 
                    href="/diabetes-profile" 
                    className="inline-flex items-center px-3 py-1.5 bg-gray-700 text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {settings.nightscoutUrl && !settings.nightscoutApiToken ? "Add API Token" : "Configure Nightscout"}
                  </a>
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Continue in Manual Mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Manual Treatment Entry Form */}
      {showManualEntry && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Treatment Manually</h3>
            <button
              onClick={() => setShowManualEntry(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={manualTreatment.timestamp}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, timestamp: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Type</label>
              <select
                value={manualTreatment.type}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insulin (units)</label>
              <input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={manualTreatment.insulin}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, insulin: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (grams)</label>
              <input
                type="number"
                step="1"
                placeholder="0"
                value={manualTreatment.carbs}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, carbs: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Glucose (mg/dL)</label>
              <input
                type="number"
                step="1"
                placeholder="100"
                value={manualTreatment.glucoseValue}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, glucoseValue: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={3}
                placeholder="Optional notes..."
                value={manualTreatment.notes}
                onChange={(e) => setManualTreatment(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={saveManualTreatment}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
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
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear Form
            </button>
          </div>
        </div>
      )}
      
      <div className="flex gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <button onClick={fetchTreatments} className="bg-blue-600 text-white px-4 py-2 rounded">Fetch</button>
      </div>
      {loading && <div>Loading...</div>}
      {error && (
        <div className="text-red-600 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Configuration Required</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                  {error.includes('API token') && (
                    <div className="mt-3">
                      <a 
                        href="/diabetes-profile" 
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border px-2 py-1">Time</th>
                <th className="border px-2 py-1">Event Type</th>
                <th className="border px-2 py-1">Insulin</th>
                <th className="border px-2 py-1">Carbs</th>
                <th className="border px-2 py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {treatments.map((t, i) => (
                <tr key={t._id || t.id || i}>
                  <td className="border px-2 py-1">
                    {t.created_at ? new Date(t.created_at).toLocaleString() : 
                     t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}
                  </td>
                  <td className="border px-2 py-1">{t.eventType || t.type || ''}</td>
                  <td className="border px-2 py-1">{t.insulin || t.insulinUnits || ''}</td>
                  <td className="border px-2 py-1">{t.carbs || t.carbsGrams || ''}</td>
                  <td className="border px-2 py-1">{t.notes || t.reason || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {treatments.length === 0 && !loading && <div className="text-gray-500 mt-4">No treatments found for this range.</div>}
    </div>
  );
} 