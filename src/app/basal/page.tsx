'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type BasalRate = {
  id?: string;
  startTime: string;
  rate: number;
};

type BasalProfile = {
  id: string;
  name: string;
  isActive: boolean;
  rates: BasalRate[];
  createdAt: string;
  updatedAt: string;
};

export default function BasalProfilesPage() {
  const [profiles, setProfiles] = useState<BasalProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BasalProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rates: [{ startTime: '00:00', rate: 0 }]
  });

  const router = useRouter();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/basal');
      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }
      const data = await response.json();
      setProfiles(data);
    } catch (error) {
      setError('Error fetching profiles');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingProfile ? 'PUT' : 'POST';
      const url = '/api/basal';
      const body = editingProfile 
        ? { ...formData, id: editingProfile.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      await fetchProfiles();
      setShowForm(false);
      setEditingProfile(null);
      setFormData({ name: '', rates: [{ startTime: '00:00', rate: 0 }] });
    } catch (error) {
      setError('Error saving profile');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    try {
      const response = await fetch(`/api/basal?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }

      await fetchProfiles();
    } catch (error) {
      setError('Error deleting profile');
      console.error('Error:', error);
    }
  };

  const addRate = () => {
    setFormData(prev => ({
      ...prev,
      rates: [...prev.rates, { startTime: '00:00', rate: 0 }]
    }));
  };

  const removeRate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.filter((_, i) => i !== index)
    }));
  };

  const updateRate = (index: number, field: keyof BasalRate, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.map((rate, i) => 
        i === index ? { ...rate, [field]: value } : rate
      )
    }));
  };

  const handleEdit = (profile: BasalProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      rates: profile.rates
    });
    setShowForm(true);
  };

  const handleImportFromNightscout = async () => {
    try {
      setError('');
      const response = await fetch('/api/nightscout/profile');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Nightscout profile');
      }
      const data = await response.json();
      
      if (data && data.basal) {
        setFormData({
          name: data.name || 'Imported from Nightscout',
          rates: data.basal
        });
        setShowForm(true);
      } else {
        throw new Error('Invalid profile data received from Nightscout');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error importing from Nightscout');
      console.error('Error:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Basal Rate Profiles</h1>
      
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => {
            setEditingProfile(null);
            setFormData({ name: '', rates: [{ startTime: '00:00', rate: 0 }] });
            setShowForm(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Create New Profile
        </button>
        <button
          onClick={handleImportFromNightscout}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Import from Nightscout
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingProfile ? 'Edit Profile' : 'New Profile'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Profile Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Basal Rates
              </label>
              {formData.rates.map((rate, index) => (
                <div key={index} className="flex gap-4 mb-2">
                  <div className="flex-1">
                    <input
                      type="time"
                      value={rate.startTime}
                      onChange={(e) => updateRate(index, 'startTime', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={rate.rate}
                      onChange={(e) => updateRate(index, 'rate', parseFloat(e.target.value))}
                      step="0.025"
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  {formData.rates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRate(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRate}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
              >
                + Add Rate
              </button>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingProfile(null);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{profile.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(profile)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Rates:</h4>
                <div className="space-y-2">
                  {profile.rates
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((rate) => (
                    <div key={rate.id} className="flex justify-between text-sm">
                      <span>{rate.startTime}</span>
                      <span>{rate.rate.toFixed(3)} U/hr</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 