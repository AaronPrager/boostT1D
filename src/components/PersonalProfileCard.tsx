'use client';

import React from 'react';

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
  occupation?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  preferences?: {
    units?: 'metric' | 'imperial';
    timezone?: string;
    language?: string;
  };
}

interface PersonalProfileCardProps {
  profile: PersonalProfileData;
  showFullDetails?: boolean;
}

export default function PersonalProfileCard({ profile, showFullDetails = false }: PersonalProfileCardProps) {
  const formatAddress = () => {
    const { address } = profile;
    if (!address) return '';
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const formatAge = () => {
    if (!profile.dateOfBirth) return '';
    
    const birthDate = new Date(profile.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    
    return age;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {profile.photo ? (
            <img
              src={profile.photo}
              alt={profile.name || 'Profile'}
              className="h-16 w-16 rounded-full object-cover border-2 border-gray-300"
              onError={(e) => {
                e.currentTarget.src = `https://via.placeholder.com/64x64?text=${encodeURIComponent(profile.name?.charAt(0) || 'U')}`;
              }}
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
              <span className="text-gray-500 text-lg font-medium">
                {profile.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {profile.name || 'No name provided'}
          </h3>
          {profile.occupation && (
            <p className="text-sm text-gray-600">{profile.occupation}</p>
          )}
          {profile.dateOfBirth && (
            <p className="text-sm text-gray-500">Age: {formatAge()}</p>
          )}
        </div>
      </div>

      {profile.about && (
        <div className="mt-4">
          <p className="text-sm text-gray-700">{profile.about}</p>
        </div>
      )}

      {showFullDetails && (
        <div className="mt-6 space-y-4">
          {profile.phone && (
            <div>
              <h4 className="text-sm font-medium text-gray-900">Phone</h4>
              <p className="text-sm text-gray-600">{profile.phone}</p>
            </div>
          )}

          {formatAddress() && (
            <div>
              <h4 className="text-sm font-medium text-gray-900">Address</h4>
              <p className="text-sm text-gray-600">{formatAddress()}</p>
            </div>
          )}

          {profile.emergencyContact?.name && (
            <div>
              <h4 className="text-sm font-medium text-gray-900">Emergency Contact</h4>
              <p className="text-sm text-gray-600">
                {profile.emergencyContact.name}
                {profile.emergencyContact.relationship && ` (${profile.emergencyContact.relationship})`}
              </p>
              {profile.emergencyContact.phone && (
                <p className="text-sm text-gray-500">{profile.emergencyContact.phone}</p>
              )}
            </div>
          )}

          {profile.preferences && (
            <div>
              <h4 className="text-sm font-medium text-gray-900">Preferences</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Units: {profile.preferences.units === 'metric' ? 'Metric' : 'Imperial'}</p>
                {profile.preferences.timezone && (
                  <p>Timezone: {profile.preferences.timezone}</p>
                )}
                {profile.preferences.language && (
                  <p>Language: {profile.preferences.language.toUpperCase()}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 