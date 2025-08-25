'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('Home page - Session status:', { status, hasSession: !!session, session });
    
    if (status === 'loading') return; // Wait for session to load
    
    if (session) {
      // User is logged in - redirect to dashboard
      console.log('User logged in, redirecting to dashboard');
      router.replace('/dashboard');
    } else {
      // User is not logged in - redirect to personal page (landing page)
      console.log('User not logged in, redirecting to personal page');
      router.replace('/personal');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {status === 'loading' ? 'Loading...' : 
           session ? 'Redirecting to Dashboard...' : 'Redirecting to Personal Page...'}
        </p>
      </div>
    </div>
  );
}
