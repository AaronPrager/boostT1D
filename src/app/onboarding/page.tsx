'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import StepAuth from '@/components/onboarding/StepAuth';
import StepPhoto from '@/components/onboarding/StepPhoto';
import StepGeneralInfo from '@/components/onboarding/StepGeneralInfo';
import StepDiabetesSettings from '@/components/onboarding/StepDiabetesSettings';
import StepTerms from '@/components/onboarding/StepTerms';

interface OnboardingData {
  // Step 1
  name: string;
  email: string;
  password: string;
  // Step 2
  photo?: string;
  // Step 3
  age?: number;
  yearsSinceDiagnosis?: string;
  country?: string;
  state?: string;
  // Step 4
  isManualMode?: boolean;
  nightscoutUrl?: string;
  nightscoutApiToken?: string;
  lowGlucose?: number;
  highGlucose?: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    name: '',
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 5;

  const handleStep1Complete = (data: { email: string; password: string; name: string }) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: { photo?: string }) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: { age: number; yearsSinceDiagnosis: string; country: string; state?: string }) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(4);
  };

  const handleStep4Complete = (data: { isManualMode: boolean; nightscoutUrl?: string; nightscoutApiToken?: string; lowGlucose: number; highGlucose: number }) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(5);
  };

  const handleFinalComplete = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Register user with all data including diabetes settings and photo in one call
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          photo: formData.photo,
          country: formData.country,
          state: formData.state,
          age: formData.age,
          yearsSinceDiagnosis: formData.yearsSinceDiagnosis,
          nightscoutUrl: formData.nightscoutUrl || '',
          nightscoutApiToken: formData.nightscoutApiToken || '',
          lowGlucose: formData.lowGlucose || 70,
          highGlucose: formData.highGlucose || 180
        })
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerData.message || registerData.error || 'Registration failed');
      }

      // Redirect to login with success message
      router.push('/login?message=Registration successful! Please sign in to continue.');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={totalSteps}>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <StepAuth
          onNext={handleStep1Complete}
          initialData={formData}
        />
      )}

      {currentStep === 2 && (
        <StepPhoto
          onNext={handleStep2Complete}
          onBack={() => setCurrentStep(1)}
          initialData={formData}
        />
      )}

      {currentStep === 3 && (
        <StepGeneralInfo
          onNext={handleStep3Complete}
          onBack={() => setCurrentStep(2)}
          initialData={formData}
        />
      )}

      {currentStep === 4 && (
        <StepDiabetesSettings
          onNext={handleStep4Complete}
          onBack={() => setCurrentStep(3)}
          initialData={formData}
        />
      )}

      {currentStep === 5 && (
        <StepTerms
          onComplete={handleFinalComplete}
          onBack={() => setCurrentStep(4)}
        />
      )}

      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-semibold text-gray-900">Creating your account...</p>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}

