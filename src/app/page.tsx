'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Footer from '@/components/Footer';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (session) {
      router.replace('/welcome');
    }
  }, [session, status, router]);

  // Show loading state while checking authentication or redirecting
  if (status === 'loading' || session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            {status === 'loading' ? 'Loading...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  // Show welcome page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <header className="bg-white shadow-xl border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div 
                className="w-40 h-16 bg-white flex items-center justify-center"
                style={{
                  backgroundImage: 'url(/favicon-256x256.png?v=4)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }}
              />
            </div>
            <nav className="flex space-x-6">
              <a href="/login" className="text-gray-700 hover:text-blue-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-blue-50 rounded-lg font-sans">
                Sign In
              </a>
              <a href="/onboarding" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-sans">
                Get Started
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20 py-12">
          <div className="inline-flex items-center px-6 py-3 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full mb-8">
            Professional Diabetes Management Platform
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight font-sans">
            <span className="block leading-tight text-gray-900">Take Control of Your</span>
            <span className="block leading-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Diabetes Management
            </span>
          </h1>
          <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-12 font-sans">
            BoostT1D provides intelligent diabetes management tools with AI-powered insights, 
            comprehensive glucose tracking, and personalized therapy recommendations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/onboarding" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-xl hover:shadow-2xl">
              Get Started
            </a>
            <a href="/login" className="border-2 border-blue-300 text-blue-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-blue-500 hover:bg-blue-50 transition-all duration-200">
              Sign In
            </a>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl shadow-2xl border border-blue-200 p-12 max-w-4xl mx-auto mb-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6 font-sans">AI-Powered Food Analysis</h3>
            <p className="text-xl text-gray-700 leading-relaxed mb-8 max-w-2xl mx-auto font-sans">
              Get instant carb estimates for your meals using cutting-edge AI photo analysis technology for precise diabetes management.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/food-analysis" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-xl hover:shadow-2xl">
                Try Food Estimator
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a href="/onboarding" className="inline-flex items-center px-8 py-4 border-2 border-blue-300 text-blue-700 text-lg font-semibold rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200">
                Learn More
              </a>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl shadow-2xl border border-blue-200 p-12 max-w-4xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="mb-8">
              <div className="relative">
                <img
                  src="/aaron-profile.JPG"
                  alt="Aaron Prager's profile photo"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-300 shadow-2xl"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
              </div>
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center font-sans">Aaron Prager</h3>
            <p className="text-xl text-gray-700 font-semibold mb-4 text-center font-sans">Student Developer & Creator</p>
            <p className="text-lg text-gray-700 text-center leading-relaxed mb-8 max-w-2xl font-sans">
              Hey! I'm Aaron, a junior at the British International School of Boston. I'm passionate about using tech to make diabetes management easier and more effective. I built this platform to help people like you take control of their health with smart tools and AI-powered insights.
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://www.linkedin.com/in/aaron-prager-6675b5230/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.5 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 10a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H6a1 1 0 01-1-1v-4zM7 10a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1v-4z" />
                </svg>
                LinkedIn Profile
              </a>
              <a 
                href="mailto:arik@pragersfamily.com" 
                className="inline-flex items-center px-6 py-3 border-2 border-blue-300 text-blue-700 text-lg font-semibold rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:text-blue-900 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Aaron
              </a>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}