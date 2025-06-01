import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function PhotoDebugger() {
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<any>(null);
  const [photoStatus, setPhotoStatus] = useState<string>('checking...');

  useEffect(() => {
    const debugProfile = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch('/api/personal-profile');
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
          
          // Test if photo URL is accessible
          if (data.photo) {
            const img = new Image();
            img.onload = () => setPhotoStatus('✅ Photo loads successfully');
            img.onerror = () => setPhotoStatus('❌ Photo failed to load');
            img.src = data.photo;
          } else {
            setPhotoStatus('🚫 No photo URL found');
          }
        }
      } catch (error) {
        console.error('Debug fetch error:', error);
        setPhotoStatus('❌ API fetch failed');
      }
    };

    debugProfile();
  }, [session]);

  if (!session?.user) return null;

  return (
    <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-2">🔍 Photo Debug Info</h3>
      <div className="space-y-2 text-sm">
        <p><strong>Photo URL:</strong> {profileData?.photo || 'None'}</p>
        <p><strong>Status:</strong> {photoStatus}</p>
        <p><strong>User Image:</strong> {session.user.image || 'None'}</p>
        <p><strong>User Name:</strong> {session.user.name || 'None'}</p>
        {profileData?.photo && (
          <div>
            <p><strong>Test Image:</strong></p>
            <img
              src={profileData.photo}
              alt="Debug test"
              className="w-16 h-16 rounded border"
              onLoad={() => console.log('Debug image loaded')}
              onError={() => console.log('Debug image failed')}
            />
          </div>
        )}
      </div>
    </div>
  );
} 