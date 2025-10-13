'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

type FormData = {
  email: string;
  password: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  // Function to clear messages when user starts typing
  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  useEffect(() => {
    const registered = searchParams.get('registered');
    
    if (registered === 'true') {
      setSuccessMessage('Account created successfully! You can now sign in to your account.');
    }
  }, [searchParams]);

  const onSubmit = async (data: FormData) => {
    setError('');
    setSuccessMessage('');
    
    try {
      console.log('Attempting login with:', data.email);
      
      // Use NextAuth without redirect, handle manually
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      console.log('SignIn result:', result);
      
      if (result?.error) {
        console.error('SignIn error:', result.error);
        setError('Invalid email or password. Please try again.');
      } else if (result?.ok) {
        console.log('Login successful, waiting for session to establish...');
        
        // Wait for session to be established
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          const session = await getSession();
          if (session) {
            console.log('Session established, redirecting to welcome page');
            router.push('/welcome');
            return;
          }
          
          // Wait 200ms before next attempt
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        
        // If we get here, session didn't establish properly
        console.warn('Session not established after login, redirecting anyway');
        router.push('/welcome');
      } else {
        console.error('SignIn returned unexpected result:', result);
        setError('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Login exception:', error);
      if (error instanceof Error) {
        setError(`Login failed: ${error.message}`);
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Navigation />

      {/* Main Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Sign in to your account
              </h2>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{successMessage}</span>
                </div>
              )}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{error}</span>
                  {error.includes('Invalid email or password') && (
                    <div className="mt-2 text-sm text-red-600">
                      💡 <strong>Tips:</strong> Check that your email is correct and ensure Caps Lock is off when typing your password.
                    </div>
                  )}
                  {error.includes('No account found') && (
                    <div className="mt-2 text-sm text-red-600">
                      💡 <strong>Need an account?</strong> <Link href="/onboarding" className="underline hover:no-underline">Sign up here</Link>
                    </div>
                  )}
                </div>
              )}
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    id="email"
                    type="email"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                    onFocus={clearMessages}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    {...register('password', { required: 'Password is required' })}
                    id="password"
                    type="password"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                    onFocus={clearMessages}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-gray-600 hover:text-gray-900">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Sign in
                </button>
              </div>
            </form>
            <div className="text-sm text-center mt-6">
              <Link href="/onboarding" className="font-medium text-gray-600 hover:text-gray-900">
                Don't have an account? Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}