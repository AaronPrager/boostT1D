'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function Navigation() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback: manually redirect to home page
      router.push('/');
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

  return (
    <nav className="bg-white shadow-lg" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2 text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors">
                <div className="flex items-center space-x-1">
                  <div className="flex flex-col leading-tight">
                    <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Boost
                    </span>
                    <span className="text-xs font-semibold text-red-500 -mt-1">
                      T1D
                    </span>
                  </div>
                  <span className="text-xl">⚡</span>
                </div>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              {session && (
                <>
                  {/* Diabetes Management Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown('diabetes')}
                      className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      🩺 Diabetes Management
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
                            📊 Dashboard
                          </Link>
                          <Link 
                            href="/treatments" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={closeDropdown}
                          >
                            💊 Treatments
                          </Link>
                          <Link 
                            href="/analysis" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={closeDropdown}
                          >
                            📊 Analysis
                          </Link>
                          <Link 
                            href="/profile" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={closeDropdown}
                          >
                            🩺 Diabetes Profile
                          </Link>
                          <Link 
                            href="/readings" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={closeDropdown}
                          >
                            📈 Readings
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
                      🍎 Carb Estimator
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
                            🔍 Food Analysis
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Buddies - Standalone */}
                  <Link href="/buddies" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                    🤝 Buddies
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
                            👤 Personal Profile
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {session ? (
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/signin" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Sign In
                </Link>
                <Link href="/auth/signin?tab=register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 