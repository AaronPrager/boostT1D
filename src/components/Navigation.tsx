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
    <nav className="bg-white shadow-lg border-b border-gray-200 mb-6" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                <span className="text-xl font-bold text-blue-600">
                  BoostT1D
                </span>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          {session && (
            <div className="hidden sm:flex sm:items-center sm:space-x-8 sm:flex-1 sm:justify-evenly sm:mx-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              
              {/* Diabetes Management Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('diabetes')}
                  className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Diabetes Management
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'diabetes' && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link 
                        href="/dashboard" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Dashboard
                      </Link>
                      <Link 
                        href="/diabetes-profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Diabetes Profile
                      </Link>
                      <hr className="my-2 border-gray-200" />
                      <Link 
                        href="/readings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Blood Glucose Data
                      </Link>
                      <Link 
                        href="/treatments" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Treatments
                      </Link>
                      <hr className="my-2 border-gray-200" />
                      <Link 
                        href="/analysis" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Therapy Adjustments
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Carb Estimator Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('carb')}
                  className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Carb Estimator
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'carb' && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link 
                        href="/food-analysis" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Food Analysis
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Buddies - Standalone */}
              <Link href="/buddies" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Buddies
              </Link>

              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('account')}
                  className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover mr-2 border border-gray-300"
                    />
                  ) : (
                    <span className="mr-2">👤</span>
                  )}
                  Account
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {activeDropdown === 'account' && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link 
                        href="/personal-profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={closeDropdown}
                      >
                        Personal Profile
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Desktop Sign In/Out */}
          <div className="hidden sm:flex sm:items-center">
            {session ? (
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Sign In
                </Link>
                <Link href="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
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
          <div className="sm:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                href="/" 
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={closeMobileMenu}
              >
                Home
              </Link>

              {session && (
                <>
                  {/* Diabetes Management Section */}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Diabetes Management
                    </div>
                    <Link 
                      href="/dashboard" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/diabetes-profile" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Diabetes Profile
                    </Link>
                    <hr className="my-2 border-gray-200" />
                    <Link 
                      href="/readings" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Blood Glucose Data
                    </Link>
                    <Link 
                      href="/treatments" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Treatments
                    </Link>
                    
                    <hr className="my-2 border-gray-200" />
                    <Link 
                      href="/analysis" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Therapy Adjustments
                    </Link>
                  </div>

                  {/* Carb Estimator Section */}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Carb Estimator
                    </div>
                    <Link 
                      href="/food-analysis" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Food Analysis
                    </Link>
                  </div>

                  {/* Buddies */}
                  <div className="border-t border-gray-200 pt-2">
                    <Link 
                      href="/buddies" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Buddies
                    </Link>
                  </div>

                  {/* Account Section */}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Account
                    </div>
                    <Link 
                      href="/personal-profile" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Personal Profile
                    </Link>
                  </div>
                </>
              )}

              {/* Sign In/Out Section */}
              <div className="border-t border-gray-200 pt-2">
                {session ? (
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleSignOut();
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                ) : (
                  <>
                    <Link 
                      href="/login" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={closeMobileMenu}
                    >
                      Sign In
                    </Link>
                    <Link 
                      href="/register" 
                      className="block px-3 py-2 rounded-md text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700"
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