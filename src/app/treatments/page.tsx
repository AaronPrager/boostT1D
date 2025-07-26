'use client';

import { useState } from 'react';

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
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTreatments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch treatments');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Nightscout Treatments</h1>
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
      {error && <div className="text-red-600">{error}</div>}
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
                <tr key={t._id || i}>
                  <td className="border px-2 py-1">{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</td>
                  <td className="border px-2 py-1">{t.eventType || ''}</td>
                  <td className="border px-2 py-1">{t.insulin ?? ''}</td>
                  <td className="border px-2 py-1">{t.carbs ?? ''}</td>
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