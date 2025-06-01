import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PersonalProfileData {
  name?: string;
  about?: string;
  photo?: string;
  phone?: string;
  dateOfBirth?: string;
  occupation?: string;
}

interface UserProfileHeaderProps {
  showDetailed?: boolean;
  className?: string;
}

export default function UserProfileHeader({ showDetailed = false, className = '' }: UserProfileHeaderProps) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<PersonalProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/personal-profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          console.error('UserProfileHeader - Failed to fetch profile:', response.status);
        }
      } catch (error) {
        console.error('UserProfileHeader - Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-300 h-16 w-16"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const age = profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          {(() => {
            return profile?.photo ? (
              <img
                src={profile.photo}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                onLoad={() => {
                }}
                onError={(e) => {
                  e.currentTarget.src = `https://via.placeholder.com/64x64?text=${encodeURIComponent(
                    (profile?.name || session.user.email)?.charAt(0)?.toUpperCase() || 'U'
                  )}`;
                }}
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-gray-200">
                <span className="text-indigo-600 text-xl font-medium">
                  {(profile?.name || session.user.email)?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Profile Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {profile?.name || session.user.name || 'User'}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {session.user.email}
              </p>
              {profile?.occupation && (
                <p className="text-sm text-gray-600 mt-1">
                  {profile.occupation}
                </p>
              )}
            </div>
            {age && (
              <div className="text-right">
                <span className="text-sm text-gray-500">Age</span>
                <p className="text-lg font-medium text-gray-900">{age}</p>
              </div>
            )}
          </div>

          {showDetailed && (
            <div className="mt-4 space-y-2">
              {profile?.about && (
                <p className="text-sm text-gray-700 max-w-md overflow-hidden">
                  {profile.about.length > 100 ? `${profile.about.substring(0, 100)}...` : profile.about}
                </p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {profile?.phone && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{profile.phone}</span>
                  </div>
                )}
                
                {profile?.dateOfBirth && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(profile.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 