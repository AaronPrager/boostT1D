'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import UserProfileHeader from '@/components/UserProfileHeader';

export default function DebugProfilePage() {
  const { data: session } = useSession();
  const [debugData, setDebugData] = useState<any>(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      if (!session?.user?.email) return;
      
      try {
        const response = await fetch('/api/debug-profile');
        if (response.ok) {
          const data = await response.json();
          setDebugData(data);
          console.log('Debug data:', data);
        }
      } catch (error) {
        console.error('Failed to fetch debug data:', error);
      }
    };

    fetchDebugData();
  }, [session]);

  if (!session) {
    return <div className="p-8">Please log in to debug profile</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Profile Page</h1>
      
      {/* UserProfileHeader Component */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">UserProfileHeader Component:</h2>
        <UserProfileHeader showDetailed={true} />
      </div>
      
      {/* Debug Information */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Debug Information:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {debugData ? JSON.stringify(debugData, null, 2) : 'Loading...'}
        </pre>
      </div>

      {/* Check Console */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Instructions:</h2>
        <p className="text-gray-700">
          Open browser console to see debug logs from UserProfileHeader component.
        </p>
      </div>
    </div>
  );
} 