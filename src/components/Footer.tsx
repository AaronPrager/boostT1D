'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Legal Disclaimers */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h4 className="text-white font-semibold text-lg mb-4">⚠️ Important Medical Disclaimer</h4>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              <strong>BoostT1D is not a medical device or replacement for professional medical care.</strong> 
              This platform provides informational tools and should not be used as the sole basis for medical decisions. 
              Always consult with your healthcare provider before making changes to your diabetes management plan.
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              <strong>Emergency Notice:</strong> If you are experiencing a medical emergency, call your local emergency services immediately. 
              Do not rely on this platform for emergency medical situations.
            </p>
          </div>
          
          <div className="mb-6">
            <h4 className="text-white font-semibold mb-4 text-center">Legal Information</h4>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="/legal/privacy" className="text-gray-300 hover:text-blue-400 transition-colors text-sm">
                Privacy Policy
              </a>
              <a href="/legal/terms" className="text-gray-300 hover:text-blue-400 transition-colors text-sm">
                Terms of Service
              </a>
              <a href="/legal/disclaimer" className="text-gray-300 hover:text-blue-400 transition-colors text-sm">
                Medical Disclaimer
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} BoostT1D. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Developed by Aaron Prager | Not FDA Approved | For Educational Purposes Only
              </p>
            </div>
            <div className="flex space-x-4">
              <a href="https://www.linkedin.com/in/aaron-prager-6675b5230/" className="text-gray-400 hover:text-blue-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.5 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 10a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H6a1 1 0 01-1-1v-4zM7 10a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1v-4z" />
                </svg>
              </a>
              <a href="mailto:arik@pragersfamily.com" className="text-gray-400 hover:text-blue-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 