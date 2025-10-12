'use client';

import React, { useState } from 'react';

interface Step4TermsProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function Step4Terms({ onComplete, onBack }: Step4TermsProps) {
  const [hasAgreed, setHasAgreed] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Terms of Use</h2>
        <p className="text-gray-600">Please read and agree to continue</p>
      </div>

      {/* Scrollable Terms Content */}
      <div className="flex-1 overflow-y-auto space-y-6 mb-6 px-2">
        {/* Medical Disclaimer - Critical */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-6 w-6 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-bold text-red-900">IMPORTANT MEDICAL DISCLAIMER</h3>
              <p className="text-sm text-red-800 mt-1">
                BoostT1D is NOT a medical device and is NOT intended to replace professional medical advice, diagnosis, or treatment. This application is provided as an informational and educational tool only.
              </p>
            </div>
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-4 text-sm">
          {/* Section 1 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">1. No Medical Advice</h4>
            <p className="text-gray-700">
              BoostT1D does not provide medical advice. All content, features, and suggestions are for informational purposes only. Always consult with your healthcare provider before making any changes to your diabetes management plan, insulin dosages, diet, or exercise routine.
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">2. AI-Generated Content</h4>
            <p className="text-gray-700">
              BoostT1D uses artificial intelligence to analyze glucose data. AI-generated content may contain errors or inaccuracies. AI suggestions are not a substitute for professional medical judgment and should always be reviewed by your healthcare provider.
            </p>
          </div>

          {/* Section 3 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">3. User Responsibility</h4>
            <p className="text-gray-700">
              You are solely responsible for your diabetes management decisions. Any insulin dosing, medication changes, or treatment adjustments must be made in consultation with your qualified healthcare provider. Never make changes based solely on this app.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">4. Data Accuracy</h4>
            <p className="text-gray-700">
              BoostT1D does not guarantee the accuracy, completeness, or reliability of any data, analysis, or suggestions provided. Always verify critical information with your medical devices and healthcare provider.
            </p>
          </div>

          {/* Section 5 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">5. Emergency Situations</h4>
            <p className="text-gray-700">
              BoostT1D is NOT designed for emergency use. In case of severe hypoglycemia, hyperglycemia, DKA, or any medical emergency, call 911 immediately and follow your emergency action plan.
            </p>
          </div>

          {/* Section 6 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">6. Third-Party Integrations</h4>
            <p className="text-gray-700">
              BoostT1D may integrate with services like Nightscout. We are not responsible for the accuracy, availability, or security of third-party services.
            </p>
          </div>

          {/* Section 7 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">7. Limitation of Liability</h4>
            <p className="text-gray-700">
              BoostT1D and its developers shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from your use of this application, including health complications or medical emergencies.
            </p>
          </div>

          {/* Section 8 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">8. Privacy & Data Security</h4>
            <p className="text-gray-700">
              Your health data is sensitive. While we implement security measures, no system is completely secure. Review our Privacy Policy for details on data handling.
            </p>
          </div>

          {/* Section 9 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">9. Healthcare Provider Consultation</h4>
            <p className="text-gray-700">
              You must work with a qualified healthcare provider for diabetes management. Share all app-generated reports with your healthcare team. Never adjust insulin doses without professional medical supervision.
            </p>
          </div>

          {/* Section 10 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">10. Age Requirements</h4>
            <p className="text-gray-700">
              If you are under 18 years of age, you must have parental or guardian consent to use this application.
            </p>
          </div>

          {/* Section 11 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">11. Changes to Terms</h4>
            <p className="text-gray-700">
              We may update these Terms at any time. Your continued use constitutes acceptance of updated terms.
            </p>
          </div>

          {/* Section 12 */}
          <div>
            <h4 className="font-bold text-gray-900 mb-1">12. Acceptance of Terms</h4>
            <p className="text-gray-700">
              By clicking "I Understand and Agree" below, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use. You understand that BoostT1D is not a medical device and should not replace professional medical care.
            </p>
          </div>
        </div>

        {/* Final Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-bold text-blue-900">Your Health is Priority</h3>
              <p className="text-sm text-blue-800 mt-1">
                Always consult your healthcare provider for medical decisions. Use BoostT1D as a tool to support—not replace—professional medical care.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agreement Checkbox */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setHasAgreed(!hasAgreed)}
          className="flex items-start w-full text-left mb-4 group"
        >
          <div className={`flex-shrink-0 w-6 h-6 border-2 rounded flex items-center justify-center mr-3 transition-all ${
            hasAgreed ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-gray-400'
          }`}>
            {hasAgreed && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="font-semibold text-gray-900">
            I have read and agree to the Terms of Use
          </span>
        </button>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200"
          >
            <svg className="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back
          </button>
          
          <button
            type="button"
            onClick={hasAgreed ? onComplete : undefined}
            disabled={!hasAgreed}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
              hasAgreed
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl cursor-pointer'
                : 'bg-gray-400 text-white opacity-60 cursor-not-allowed'
            }`}
          >
            I Understand and Agree
            <svg className="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

