'use client';

import { useEffect } from 'react';

export default function Home() {
  // Redirect to personal page immediately since this is the personal diabetes management website
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/personal';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Personal Dashboard...</p>
      </div>
    </div>
  );
}
