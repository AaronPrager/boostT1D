'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type TreatmentType = 'bg' | 'bolus' | 'food';

interface TreatmentFormData {
  type: TreatmentType;
  glucoseValue?: number;
  carbsGrams?: number;
  insulinUnits?: number;
  insulinType?: string;
  notes?: string;
  timestamp: string | Date;
}

interface Settings {
  nightscoutUrl: string;
  lowGlucose: number;
  highGlucose: number;
}

// Add these helper functions at the top level
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeForInput = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatDateTimeForInput = (date: Date): string => {
  return `${formatDateForInput(date)}T${formatTimeForInput(date)}`;
};

const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

export default function TreatmentsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Settings>({
    nightscoutUrl: '',
    lowGlucose: 70,
    highGlucose: 180
  });
  const [formData, setFormData] = useState<TreatmentFormData>({
    type: 'bg',
    timestamp: formatDateTimeForInput(new Date()), // Use local time format
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch settings when component mounts
  useEffect(() => {
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

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      // Validate required fields based on type
      if (formData.type === 'bg' && !formData.glucoseValue) {
        throw new Error('Blood glucose value is required');
      }
      if (formData.type === 'bolus' && (!formData.insulinUnits || !formData.insulinType)) {
        throw new Error('Insulin units and type are required');
      }
      if (formData.type === 'food' && !formData.carbsGrams) {
        throw new Error('Carbs value is required');
      }
      if (formData.type === 'food' && formData.insulinUnits && !formData.insulinType) {
        throw new Error('Insulin type is required when specifying insulin units');
      }

      const response = await fetch('/api/treatments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date(formData.timestamp).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save treatment');
      }

      const data = await response.json();
      console.log('Treatment saved:', data);

      setMessage({ type: 'success', text: 'Treatment saved successfully!' });
      // Reset form
      setFormData({
        type: 'bg',
        timestamp: new Date().toISOString().slice(0, 16),
      });
    } catch (error) {
      console.error('Error saving treatment:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save treatment. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentDate = new Date(formData.timestamp);
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day, currentDate.getHours(), currentDate.getMinutes());
    setFormData({ ...formData, timestamp: formatDateTimeForInput(newDate) });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentDate = new Date(formData.timestamp);
    const { hours, minutes } = parseTimeString(e.target.value);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hours, minutes);
    setFormData({ ...formData, timestamp: formatDateTimeForInput(newDate) });
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-red-600">Please log in to record treatments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Record Treatment</h2>

            {message && (
              <div 
                className={`mb-4 p-4 rounded ${
                  message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Treatment Type
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      type: e.target.value as TreatmentType,
                      // Reset type-specific fields when changing type
                      glucoseValue: undefined,
                      carbsGrams: undefined,
                      insulinUnits: undefined,
                      insulinType: undefined
                    })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="bg">Blood Glucose</option>
                    <option value="bolus">Insulin</option>
                    <option value="food">Food</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700">
                    Date & Time
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="date"
                        id="date"
                        value={formatDateForInput(new Date(formData.timestamp))}
                        onChange={handleDateChange}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                        required
                      />
                    </div>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="text"
                        id="time"
                        value={formatTimeForInput(new Date(formData.timestamp))}
                        onChange={handleTimeChange}
                        placeholder="HH:mm"
                        pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">24h</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blood Glucose field - shown for BG entries and optionally for others */}
                {(formData.type === 'bg' || formData.type === 'food') && (
                  <div>
                    <label htmlFor="glucoseValue" className="block text-sm font-medium text-gray-700">
                      Blood Glucose (mg/dL)
                    </label>
                    <input
                      type="number"
                      id="glucoseValue"
                      value={formData.glucoseValue || ''}
                      onChange={(e) => setFormData({ ...formData, glucoseValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required={formData.type === 'bg'}
                      min="0"
                      max="1000"
                    />
                  </div>
                )}

                {/* Food entry fields */}
                {formData.type === 'food' && (
                  <>
                    <div>
                      <label htmlFor="carbsGrams" className="block text-sm font-medium text-gray-700">
                        Carbs (grams)
                      </label>
                      <input
                        type="number"
                        id="carbsGrams"
                        value={formData.carbsGrams || ''}
                        onChange={(e) => setFormData({ ...formData, carbsGrams: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                        min="0"
                        step="0.1"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="insulinUnits" className="block text-sm font-medium text-gray-700">
                        Insulin Units (optional)
                      </label>
                      <input
                        type="number"
                        id="insulinUnits"
                        step="0.05"
                        value={formData.insulinUnits || ''}
                        onChange={(e) => setFormData({ ...formData, insulinUnits: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        min="0"
                      />
                    </div>

                    {formData.insulinUnits && (
                      <div>
                        <label htmlFor="insulinType" className="block text-sm font-medium text-gray-700">
                          Insulin Type
                        </label>
                        <select
                          id="insulinType"
                          value={formData.insulinType || ''}
                          onChange={(e) => setFormData({ ...formData, insulinType: e.target.value })}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          required
                        >
                          <option value="">Select insulin type</option>
                          <option value="rapid">Rapid-acting</option>
                          <option value="short">Short-acting</option>
                          <option value="intermediate">Intermediate-acting</option>
                          <option value="long">Long-acting</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* Insulin entry fields */}
                {formData.type === 'bolus' && (
                  <>
                    <div>
                      <label htmlFor="insulinUnits" className="block text-sm font-medium text-gray-700">
                        Insulin Units
                      </label>
                      <input
                        type="number"
                        id="insulinUnits"
                        step="0.05"
                        value={formData.insulinUnits || ''}
                        onChange={(e) => setFormData({ ...formData, insulinUnits: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                        min="0"
                      />
                    </div>

                    <div>
                      <label htmlFor="insulinType" className="block text-sm font-medium text-gray-700">
                        Insulin Type
                      </label>
                      <select
                        id="insulinType"
                        value={formData.insulinType || ''}
                        onChange={(e) => setFormData({ ...formData, insulinType: e.target.value })}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        required
                      >
                        <option value="">Select insulin type</option>
                        <option value="rapid">Rapid-acting</option>
                        <option value="short">Short-acting</option>
                        <option value="intermediate">Intermediate-acting</option>
                        <option value="long">Long-acting</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Treatment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 