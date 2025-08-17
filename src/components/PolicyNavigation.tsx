'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function PolicyNavigation() {
  const [session, setSession] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for policy session in localStorage
    const checkPolicySession = () => {
      const policySession = localStorage.getItem('policySessionToken');
      const policyAccount = localStorage.getItem('policyAccount');
      
      if (policySession && policyAccount) {
        try {
          const account = JSON.parse(policyAccount);
          // Check if session is still valid (24 hours from creation)
          const sessionCreated = parseInt(policySession.split('_')[2]); // Extract timestamp from session token
          const now = Date.now();
          const sessionAge = now - sessionCreated;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          if (sessionAge < maxAge) {
            setSession(account);
          } else {
            // Session expired, clear it
            localStorage.removeItem('policySessionToken');
            localStorage.removeItem('policyAccount');
            setSession(null);
          }
        } catch (error) {
          // Invalid data, clear it
          localStorage.removeItem('policySessionToken');
          localStorage.removeItem('policyAccount');
          setSession(null);
        }
      } else {
        setSession(null);
      }
    };

    // Check on initial load
    checkPolicySession();

    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'policySessionToken' || e.key === 'policyAccount') {
        checkPolicySession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Check session validity periodically (every 5 minutes)
    const interval = setInterval(checkPolicySession, 5 * 60 * 1000);
    
    // Refresh session if it's getting close to expiration (every 30 minutes)
    const refreshInterval = setInterval(() => {
      const policySession = localStorage.getItem('policySessionToken');
      if (policySession) {
        try {
          const sessionCreated = parseInt(policySession.split('_')[2]);
          const now = Date.now();
          const sessionAge = now - sessionCreated;
          const maxAge = 24 * 60 * 60 * 1000;
          
          // If session is more than 23 hours old, refresh it
          if (sessionAge > 23 * 60 * 60 * 1000) {
            // Refresh session by calling the API
            fetch('/api/policy/refresh-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionToken: policySession }),
            }).catch(() => {
              // If refresh fails, clear the session
              localStorage.removeItem('policySessionToken');
              localStorage.removeItem('policyAccount');
              setSession(null);
            });
          }
        } catch (error) {
          // Invalid session, clear it
          localStorage.removeItem('policySessionToken');
          localStorage.removeItem('policyAccount');
          setSession(null);
        }
      }
    }, 30 * 60 * 1000); // Check every 30 minutes

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setActiveDropdown(null);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 mb-6" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link 
                href="/" 
                onClick={() => {
                  // Clear policy session when switching to personal mode
                  localStorage.removeItem('policySessionToken');
                  localStorage.removeItem('policyAccount');
                  setSession(null);
                }}
                className="flex items-center text-xl font-bold text-green-600 hover:text-green-700 transition-colors"
              >
                <span className="text-xl font-bold text-green-600">
                  BoostT1D Policy
                </span>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          {session && (
            <div className="hidden sm:flex sm:items-center sm:space-x-8 sm:flex-1 sm:justify-evenly sm:mx-8">
              <Link href="/policy" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              
              {/* Policy Analysis Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('analysis')}
                  className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Policy Analysis
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'analysis' && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link 
                        href="/policy/risk-analysis" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Risk Analysis
                      </Link>
                      <Link 
                        href="/policy/coverage-gaps" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Coverage Gaps
                      </Link>
                      <Link 
                        href="/policy/price-trends" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Price Trends
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Legislation Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('legislation')}
                  className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Legislation
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'legislation' && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link 
                        href="/policy/bills" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Track Bills
                      </Link>
                      <Link 
                        href="/policy/legislators" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Legislator Profiles
                      </Link>
                      <Link 
                        href="/policy/co-sponsors" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Co-sponsor Tracking
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Advocacy Tools Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('advocacy')}
                  className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Advocacy Tools
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'advocacy' && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link 
                        href="/policy/action-items" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Action Items
                      </Link>
                      <Link 
                        href="/policy/calls-to-action" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Calls to Action
                      </Link>
                      <Link 
                        href="/policy/advocacy-resources" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Resources
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Data & Reports Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('data')}
                  className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Data & Reports
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'data' && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link 
                        href="/policy/reports" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Policy Reports
                      </Link>
                      <Link 
                        href="/policy/data-sources" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Data Sources
                      </Link>
                      <Link 
                        href="/policy/insights" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Key Insights
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('user')}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                </button>
                {activeDropdown === 'user' && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link 
                        href="/policy/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Your Profile
                      </Link>
                      <Link 
                        href="/policy/settings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Settings
                      </Link>
                      <hr className="my-2 border-gray-200" />
                      <button
                        onClick={() => {
                          localStorage.removeItem('policySessionToken');
                          localStorage.removeItem('policyAccount');
                          setSession(null);
                          window.location.href = '/policy';
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/policy"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={closeMobileMenu}
            >
              Dashboard
            </Link>
            <Link
              href="/policy/risk-analysis"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={closeMobileMenu}
            >
              Risk Analysis
            </Link>
            <Link
              href="/policy/legislation"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={closeMobileMenu}
            >
              Legislation
            </Link>
            <Link
              href="/policy/advocacy"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={closeMobileMenu}
            >
              Advocacy Tools
            </Link>
            <Link
              href="/policy/reports"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={closeMobileMenu}
            >
              Reports
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
