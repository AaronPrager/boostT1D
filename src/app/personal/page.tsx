'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function PersonalModeContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setShowRegistrationSuccess(true);
      // Clear the query parameter from URL
      window.history.replaceState({}, '', '/personal');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">


      {/* Hero Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            {/* Left Image */}
            <img
              src="/hero1.jpg"
              alt="Diabetes community"
              className="w-60 h-60 md:w-72 md:h-72 object-cover rounded-2xl shadow-xl border-4 border-indigo-300 mb-8 md:mb-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            
            {/* Title Block */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
                <span className="block">Take control of your</span>
                <span className="block text-indigo-600">diabetes management</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
                BoostT1D helps you track, analyze, and understand your blood glucose patterns with powerful visualization tools and insightful analytics.
              </p>
              

            </div>
            
            {/* Right Image */}
            <img
              src="/hero2.jpg"
              alt="Glucose monitoring"
              className="w-60 h-60 md:w-72 md:h-72 object-cover rounded-2xl shadow-xl border-4 border-purple-300 mt-8 md:mt-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </div>
        
        {/* Registration Success Message */}
        {showRegistrationSuccess && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Welcome to BoostT1D!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your account has been created. You can now explore your personal dashboard.
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setShowRegistrationSuccess(false)}
                    className="text-green-400 hover:text-green-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carb Estimator CTA Section */}
      <div className="py-16 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🍎 Try Our Carb Estimator
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Upload a photo of your meal and get instant carbohydrate estimates to help manage your diabetes.
            </p>
            <p className="text-gray-500 mb-8">
              No account required - try it now!
            </p>
            <Link
              href="/food-analysis"
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              Try Carb Estimator →
            </Link>
          </div>
        </div>
      </div>

      {/* Developer Information Section */}
      <div className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-lg p-8 border border-indigo-100">
            <div className="flex flex-col items-center justify-center">
              {/* Developer Photo */}
              <div className="mb-6">
                <img
                  src="/aaron-profile.JPG"
                  alt="Aaron's profile photo"
                  className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500 shadow-lg"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              
              {/* Developer Info */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Aaron</h2>
                <div className="space-y-2 text-lg text-gray-700 mb-6">
                  <p><span className="font-semibold">Age:</span> 16</p>
                  <p><span className="font-semibold">School:</span> British International School of Boston</p>
                  <p><span className="font-semibold">Diagnosed with T1D at:</span> 17 months old</p>
                </div>
                <div className="bg-indigo-100 rounded-lg px-4 py-2 mb-4 inline-block">
                  <p className="text-indigo-800 font-semibold text-lg">
                    Aaron is the developer of BoostT1D
                  </p>
                </div>
                <div className="text-blue-600 hover:text-blue-800 transition-colors">
                  <a href="mailto:arik@pragersfamily.com" className="font-medium">
                    arik@pragersfamily.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function PersonalMode() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PersonalModeContent />
    </Suspense>
  );
}
