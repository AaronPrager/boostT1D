'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Footer from '@/components/Footer';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading, wait
    
    if (session) {
      // User is logged in, redirect to welcome page
      router.replace('/welcome');
    }
    // If not logged in, stay on this page and show the welcome content
  }, [session, status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, show loading while redirecting
  if (session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Redirecting to welcome page...</p>
        </div>
      </div>
    );
  }

  // Show welcome page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-xl border-b-2 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>BoostT1D</h1>
            </div>
            <nav className="flex space-x-6">
              <a href="/login" className="text-gray-700 hover:text-blue-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-blue-50 rounded-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Sign In
              </a>
              <a href="/register" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Get Started
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20 py-12">
          <div className="inline-flex items-center px-6 py-3 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full mb-8">
            Professional Diabetes Management Platform
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            <span className="block leading-tight text-gray-900">Take Control of Your</span>
            <span className="block bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent leading-tight">
              Diabetes Management
            </span>
          </h1>
          <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-12" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            BoostT1D provides intelligent diabetes management tools with AI-powered insights, 
            comprehensive glucose tracking, and personalized therapy recommendations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-xl hover:shadow-2xl">
              Get Started
            </a>
            <a href="/login" className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-200">
              Sign In
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Smart Analytics</h3>
            <p className="text-gray-600 text-center leading-relaxed text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              AI-powered insights and pattern recognition to help you understand your diabetes better with enterprise-grade analytics.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Real-time Monitoring</h3>
            <p className="text-gray-600 text-center leading-relaxed text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Continuous glucose monitoring with instant alerts and comprehensive data tracking for 24/7 peace of mind.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Personalized Care</h3>
            <p className="text-gray-600 text-center leading-relaxed text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Tailored therapy recommendations and treatment plans based on your unique data and medical history.
            </p>
          </div>
        </div>

                {/* Food Carbs Estimator Section */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl shadow-2xl border border-orange-200 p-12 max-w-4xl mx-auto mb-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>🍎 AI-Powered Food Analysis</h3>
            <p className="text-xl text-gray-700 leading-relaxed mb-8 max-w-2xl mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Get instant carb estimates for your meals using cutting-edge AI photo analysis technology for precise diabetes management.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/food-analysis" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-xl hover:shadow-2xl">
                Try Food Estimator
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a href="/register" className="inline-flex items-center px-8 py-4 border-2 border-orange-300 text-orange-700 text-lg font-semibold rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all duration-200">
                Learn More
              </a>
            </div>
          </div>
        </div>



        {/* About Aaron Section */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl shadow-2xl border border-gray-200 p-12 max-w-4xl mx-auto">
          <div className="flex flex-col items-center">
            {/* Aaron's Photo */}
            <div className="mb-8">
              <div className="relative">
                <img
                  src="/aaron-profile.JPG"
                  alt="Aaron Prager's profile photo"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-2xl"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Aaron Prager</h3>
            <p className="text-xl text-blue-600 font-semibold mb-4 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Student Developer & Creator</p>
            <p className="text-lg text-gray-700 text-center leading-relaxed mb-8 max-w-2xl" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
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
                className="inline-flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 text-lg font-semibold rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
