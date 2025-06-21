'use client';

import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center min-h-[60vh] gap-8 px-4 sm:px-6 lg:px-8">
          {/* Left Image */}
          <img
            src="/hero1.jpg"
            alt="Diabetes community"
            className="w-60 h-60 md:w-72 md:h-72 object-cover rounded-2xl shadow-xl border-4 border-indigo-300 mb-8 md:mb-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Title Block */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl drop-shadow-lg">
                  <span className="block">Take control of your</span>
                  <span className="block text-indigo-600">diabetes management</span>
                </h1>
            <p className="mt-3 text-base text-gray-600 sm:mt-5 sm:text-lg sm:max-w-xl md:text-xl bg-white rounded-lg px-4 py-2 shadow-md">
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

      {/* Divider between Hero and Features */}
      <hr className="my-8 border-t-2 border-gray-200 w-3/4 mx-auto" />

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Better diabetes management through data
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              {/* Feature 1 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Advanced Analytics</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Get detailed insights into your glucose patterns with time-in-range analysis, estimated A1C, and daily pattern recognition.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Real-time Sync</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Seamlessly sync with your Nightscout site for real-time glucose data and treatment information.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Visual Reports</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Beautiful, interactive charts help you visualize trends and patterns in your glucose data.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Treatment Management</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Track insulin doses, carb intake, and other treatments with an easy-to-use interface.
                  </p>
                </div>
              </div>

              {/* Feature 5 - Buddies Community */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">T1D Buddy Matching</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Connect with other T1D individuals who share similar experiences, interests, and diabetes journey through our intelligent matching system.
                  </p>
                </div>
              </div>

              {/* Feature 6 - Food by Photo */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Food by Photo Analysis</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Take a photo of your meal and get instant carbohydrate estimates and nutritional insights to help manage your blood glucose.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - replaced with Aaron's info */}
      <div className="bg-white">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <div className="bg-white/90 rounded-xl shadow-lg p-8 flex flex-col items-center">
            <img
              src="/aaron-profile.JPG"
              alt="Aaron's profile photo"
              className="w-28 h-28 rounded-full object-cover border-4 border-indigo-500 mb-4 shadow-md"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Meet Aaron</h2>
            <p className="text-lg text-gray-700 mb-1">Age: <span className="font-semibold">16</span></p>
            <p className="text-lg text-gray-700 mb-1">School: <span className="font-semibold">British International School of Boston</span></p>
            <p className="text-lg text-gray-700 mb-1">Diagnosed with T1D at <span className="font-semibold">17 months old</span></p>
            <p className="mt-4 text-indigo-700 font-semibold text-lg bg-indigo-100 rounded px-3 py-1 shadow-sm">Aaron is the developer of BoostT1D</p>
            <a
              href="mailto:arik@pragersfamily.com"
              className="mt-2 text-blue-600 hover:underline text-base font-medium"
            >
              arik@pragersfamily.com
            </a>
          </div>
        </div>
      </div>

      {/* Divider between Aaron and Gallery */}
      <hr className="my-8 border-t-2 border-gray-200 w-3/4 mx-auto" />

      {/* Photo Gallery Section */}
      <div className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Our Community in Photos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(num => (
              <div key={num} className="rounded-xl overflow-hidden shadow-xl bg-white flex items-center justify-center aspect-[3/2]">
                <img
                  src={`/gallery${num}.JPG`}
                  alt={`Community photo ${num}`}
                  className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class='flex flex-col items-center justify-center w-full h-full text-indigo-400'><svg xmlns='http://www.w3.org/2000/svg' class='h-12 w-12 mb-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 7v10a4 4 0 004 4h10a4 4 0 004-4V7a4 4 0 00-4-4H7a4 4 0 00-4 4z' /><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 11l4 4 4-4' /></svg><span class='text-sm'>Photo unavailable</span></div>`;
                  }}
                />
              </div>
            ))}
              </div>
        </div>
      </div>
    </div>
  );
}
