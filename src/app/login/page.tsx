'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

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
    setSuccessMessage(''); // Clear success message when login attempt starts
    
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Provide meaningful error messages
        let errorMessage = 'Login failed';
        switch (result.error) {
          case 'CredentialsSignin':
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'User not found':
            errorMessage = 'No account found with this email address. Please check your email or create a new account.';
            break;
          case 'Invalid password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'Account not confirmed':
            errorMessage = 'Your account email is not confirmed. Please check your email for confirmation.';
            break;
          case 'Email and password are required':
            errorMessage = 'Please enter both your email and password.';
            break;
          default:
            errorMessage = `Login failed: ${result.error}`;
        }
        
        setError(errorMessage);
      } else if (result?.ok) {
        // Successful login - redirect to dashboard
        router.replace('/dashboard');
        router.refresh();
      } else {
        setError('Unexpected response from authentication server');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
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
                  💡 <strong>Need an account?</strong> <Link href="/register" className="underline hover:no-underline">Sign up here</Link>
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
              <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Don't have an account? Sign up
          </Link>
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