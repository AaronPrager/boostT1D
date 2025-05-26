'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white shadow-lg mt-auto">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} BoostT1D. All rights reserved.
        </p>
      </div>
    </footer>
  );
} 