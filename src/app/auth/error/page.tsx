'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const router = useRouter();
  
  // Get all query parameters for debugging
  const [allParams, setAllParams] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    setAllParams(params);
  }, [searchParams]);

  // Map error codes to user-friendly messages
  let errorMessage = 'An unknown error occurred during authentication.';
  
  if (error === 'Configuration') {
    errorMessage = 'There is a problem with the server configuration.';
  } else if (error === 'AccessDenied') {
    errorMessage = 'Access denied. You do not have permission to sign in.';
  } else if (error === 'Verification') {
    errorMessage = 'The verification link is no longer valid.';
  } else if (error === 'OAuthSignin') {
    errorMessage = 'There was a problem signing in with the authentication provider.';
  } else if (error === 'OAuthCallback') {
    errorMessage = 'There was a problem with the authentication callback.';
  } else if (error === 'OAuthCreateAccount') {
    errorMessage = 'There was a problem creating your account.';
  } else if (error === 'EmailCreateAccount') {
    errorMessage = 'There was a problem creating your account with email.';
  } else if (error === 'Callback') {
    errorMessage = 'There was a problem with the authentication callback.';
  } else if (error === 'EmailSignin') {
    errorMessage = 'There was a problem sending the email with the sign-in link.';
  } else if (error === 'CredentialsSignin') {
    errorMessage = 'The sign in credentials provided are incorrect.';
  } else if (error) {
    errorMessage = `Authentication error: ${error}`;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center">
          <h1 className="text-3xl font-bold text-red-600">Authentication Error</h1>
          <p className="mt-2 text-center text-gray-600">
            We encountered a problem while signing you in
          </p>
        </div>

        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {errorMessage}
              </h3>
            </div>
          </div>
        </div>

        {/* Debug information */}
        <div className="mt-4 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
          <div className="px-4 py-2 bg-gray-100 border-b">
            <h4 className="text-sm font-medium text-gray-700">Debug Information</h4>
          </div>
          <div className="p-4 text-xs font-mono overflow-auto max-h-40">
            {Object.entries(allParams).map(([key, value]) => (
              <div key={key} className="mb-1">
                <span className="font-semibold">{key}:</span> {value}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col space-y-4">
          <button
            onClick={() => router.push('/signin')}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="text-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}