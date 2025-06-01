'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PersonalProfileData {
  name?: string;
  about?: string;
  photo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phone?: string;
  dateOfBirth?: string;
  diagnosisAge?: number;
  favoriteActivities?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

export default function PersonalProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<PersonalProfileData>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    loadProfile();
  }, [session, status, router]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/personal-profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Mandatory fields validation
    if (!profile.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!session?.user?.email) {
      newErrors.email = 'Email is required';
    }

    if (!profile.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }

    if (!profile.diagnosisAge && profile.diagnosisAge !== 0) {
      newErrors.diagnosisAge = 'Age at diagnosis is required';
    } else if (profile.diagnosisAge < 0 || profile.diagnosisAge > 120) {
      newErrors.diagnosisAge = 'Age at diagnosis must be between 0 and 120';
    }

    if (!profile.address?.country?.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/personal-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('An error occurred while updating your profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNestedInputChange = (section: string, field: string, value: string) => {
    setProfile(prev => {
      if (section === 'address') {
        return {
          ...prev,
          address: {
            ...prev.address,
            [field]: value
          }
        };
      } else if (section === 'emergencyContact') {
        return {
          ...prev,
          emergencyContact: {
            ...prev.emergencyContact,
            [field]: value
          }
        };
      }
      return prev;
    });

    // Clear specific field error when user starts typing
    const errorKey = section === 'address' && field === 'country' ? 'country' : `${section}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/personal-profile/photos', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setProfile(prev => ({ ...prev, photo: result.url }));
        setSuccess('Photo uploaded successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Personal Profile</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your personal information and preferences
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Success/Error Messages */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={profile.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={session.user?.email || ''}
                    disabled
                    className={`mt-1 block w-full border rounded-md px-3 py-2 bg-gray-50 text-gray-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed here</p>
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    value={profile.dateOfBirth || ''}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {profile.dateOfBirth && (
                    <p className="mt-1 text-xs text-gray-500">
                      Age: {calculateAge(profile.dateOfBirth) || 'Invalid date'}
                    </p>
                  )}
                  {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
                </div>

                <div>
                  <label htmlFor="diagnosisAge" className="block text-sm font-medium text-gray-700">
                    Age at Diabetes Diagnosis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="diagnosisAge"
                    min="0"
                    max="120"
                    value={profile.diagnosisAge || ''}
                    onChange={(e) => handleInputChange('diagnosisAge', e.target.value)}
                    placeholder="e.g., 25"
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.diagnosisAge ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.diagnosisAge && <p className="mt-1 text-sm text-red-600">{errors.diagnosisAge}</p>}
                </div>
              </div>

              {/* Favorite Activities Section */}
              <div className="mt-6">
                <label htmlFor="favoriteActivities" className="block text-sm font-medium text-gray-700">
                  Favorite Activities
                </label>
                <textarea
                  id="favoriteActivities"
                  rows={3}
                  value={profile.favoriteActivities || ''}
                  onChange={(e) => handleInputChange('favoriteActivities', e.target.value)}
                  placeholder="e.g., hiking, reading, cooking, cycling, photography..."
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Share your hobbies and activities you enjoy
                </p>
              </div>

              {/* Photo Section */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Profile Photo
                </label>
                <div className="flex items-start space-x-6">
                  {/* Photo Preview */}
                  <div className="flex-shrink-0">
                    {uploadingPhoto ? (
                      <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : profile.photo ? (
                      <img
                        src={profile.photo}
                        alt="Profile"
                        className="h-24 w-24 rounded-full object-cover border-2 border-gray-300"
                        onError={(e) => {
                          e.currentTarget.src = `https://via.placeholder.com/96x96?text=${encodeURIComponent(profile.name?.charAt(0) || 'U')}`;
                        }}
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                        <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1 min-w-0">
                    <label className="block">
                      <span className="sr-only">Choose profile photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                      />
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      JPG, PNG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Address Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="street"
                    value={profile.address?.street || ''}
                    onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={profile.address?.city || ''}
                    onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State/Province
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={profile.address?.state || ''}
                    onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    value={profile.address?.zipCode || ''}
                    onChange={(e) => handleNestedInputChange('address', 'zipCode', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="country"
                    value={profile.address?.country || ''}
                    onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.country ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="emergencyName" className="block text-sm font-medium text-gray-700">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    id="emergencyName"
                    value={profile.emergencyContact?.name || ''}
                    onChange={(e) => handleNestedInputChange('emergencyContact', 'name', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="emergencyPhone"
                    value={profile.emergencyContact?.phone || ''}
                    onChange={(e) => handleNestedInputChange('emergencyContact', 'phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyRelationship" className="block text-sm font-medium text-gray-700">
                    Relationship
                  </label>
                  <input
                    type="text"
                    id="emergencyRelationship"
                    value={profile.emergencyContact?.relationship || ''}
                    onChange={(e) => handleNestedInputChange('emergencyContact', 'relationship', e.target.value)}
                    placeholder="e.g., Spouse, Parent, Sibling"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* About Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">About Me</h2>
              <div>
                <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  id="about"
                  rows={4}
                  value={profile.about || ''}
                  onChange={(e) => handleInputChange('about', e.target.value)}
                  placeholder="Tell us a little about yourself..."
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Share a brief description about yourself, your interests, or your diabetes journey
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 