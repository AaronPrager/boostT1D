'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Navigation() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: 'http://192.168.1.8:3001/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback: manually redirect to home page
      router.push('http://192.168.1.8:3001/');
    }
  };

  // Fetch user's profile photo
  const fetchUserPhoto = async () => {
    if (session?.user?.email) {
      try {
        const response = await fetch('/api/personal-profile');
        if (response.ok) {
          const profileData = await response.json();
          setUserPhoto(profileData.photo || null);
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
      }
    }
  };

  useEffect(() => {
    fetchUserPhoto();
  }, [session?.user?.email]);

  useEffect(() => {
    const handlePhotoUpdate = () => {
      fetchUserPhoto();
    };
    window.addEventListener('profilePhotoUpdated', handlePhotoUpdate);
    return () => {
      window.removeEventListener('profilePhotoUpdated', handlePhotoUpdate);
    };
  }, [session?.user?.email]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setActiveDropdown(null); // Close any open dropdowns when toggling mobile menu
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <nav className="bg-white shadow-xl border-b-2 border-blue-600 mb-6" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  BoostT1D
                </span>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          {session && (
            <div className="hidden sm:flex sm:items-center sm:space-x-8 sm:flex-1 sm:justify-evenly sm:mx-8">
              <>
                {/* Diabetes Management Dropdown */}
                <div className="relative">
                <button
                  onClick={() => toggleDropdown('diabetes')}
                  className="flex items-center text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-blue-50"
                >
                  Diabetes Management
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'diabetes' && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl shadow-2xl bg-white ring-1 ring-gray-200 z-50 border border-gray-100">
                    <div className="py-2">
                      <Link 
                        href="/dashboard" 
                        className="block px-6 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                        onClick={closeDropdown}
                      >
                        📊 Dashboard
                      </Link>
                      <Link 
                        href="/diabetes-profile" 
                        className="block px-6 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                        onClick={closeDropdown}
                      >
                        ⚙️ Diabetes Profile
                      </Link>
                      <hr className="my-2 border-gray-100" />
                      <Link 
                        href="/readings" 
                        className="block px-6 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                        onClick={closeDropdown}
                      >
                        📈 Blood Glucose Data
                      </Link>
                      <Link 
                        href="/treatments" 
                        className="block px-6 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                        onClick={closeDropdown}
                      >
                        💊 Treatments
                      </Link>
                      <hr className="my-2 border-gray-100" />
                      <Link 
                        href="/analysis" 
                        className="block px-6 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                        onClick={closeDropdown}
                      >
                        🔍 Therapy Adjustments
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Carb Estimator - Standalone */}
              <Link href="/food-analysis" className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-blue-50">
                🍎 Carb Estimator
              </Link>

              {/* Buddies - Standalone */}
              <Link href="/buddies" className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-blue-50">
                👥 Buddies
              </Link>

              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('account')}
                  className="flex items-center text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-blue-50"
                >
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover mr-2 border-2 border-blue-200"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-2">
                      <span className="text-white text-xs font-bold">👤</span>
                    </div>
                  )}
                  Account
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'account' && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl shadow-2xl bg-white ring-1 ring-gray-200 z-50 border border-gray-100">
                    <div className="py-2">
                      <Link 
                        href="/personal-profile" 
                        className="block px-6 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                        onClick={closeDropdown}
                      >
                        👤 Personal Profile
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              </>
            </div>
          )}
          
          {/* Desktop Sign In/Out */}
          <div className="hidden sm:flex sm:items-center">
            {session ? (
              <button
                onClick={handleSignOut}
                className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-blue-50"
              >
                Sign Out
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-blue-50">
                  Sign In
                </Link>
                <Link href="/register" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-200 shadow-xl">
            <div className="px-4 pt-4 pb-6 space-y-2">
              {session && (
                <>
                  {/* Diabetes Management Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="px-4 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Diabetes Management
                    </div>
                    <Link 
                      href="/dashboard" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      📊 Dashboard
                    </Link>
                    <Link 
                      href="/diabetes-profile" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      ⚙️ Diabetes Profile
                    </Link>
                    <hr className="my-2 border-gray-100" />
                    <Link 
                      href="/readings" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      📈 Blood Glucose Data
                    </Link>
                    <Link 
                      href="/treatments" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      💊 Treatments
                    </Link>
                    
                    <hr className="my-2 border-gray-100" />
                    <Link 
                      href="/analysis" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      🔍 Therapy Adjustments
                    </Link>
                  </div>

                  {/* Carb Estimator */}
                  <div className="border-t border-gray-200 pt-4">
                    <Link 
                      href="/food-analysis" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      🍎 Carb Estimator
                    </Link>
                  </div>

                  {/* Buddies */}
                  <div className="border-t border-gray-200 pt-4">
                    <Link 
                      href="/buddies" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      👥 Buddies
                    </Link>
                  </div>

                  {/* Account Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="px-4 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Account
                    </div>
                    <Link 
                      href="/personal-profile" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      👤 Personal Profile
                    </Link>
                  </div>
                </>
              )}

              {/* Sign In/Out Section */}
              <div className="border-t border-gray-200 pt-4">
                {session ? (
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleSignOut();
                    }}
                    className="block w-full text-left px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  <>
                    <Link 
                      href="/login" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Sign In
                    </Link>
                    <Link 
                      href="/register" 
                      className="block px-4 py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
                      onClick={closeMobileMenu}
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 