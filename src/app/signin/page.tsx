'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from "next/image";
import QuillLogo from "../components/QuillLogo";

export default function SignIn() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  
  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl bg-gray-800 p-8 shadow-lg border border-gray-700">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold flex items-center justify-center gap-2">
            <QuillLogo className="h-8 w-8 text-blue-500" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Welcome to SendQuill</span>
          </h1>
          <p className="text-gray-300">Sign in to start creating personalized email campaigns</p>
        </div>
        
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 px-6 py-3 text-sm font-medium text-gray-200 shadow-sm transition-all hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-blue-400"></div>
          ) : (
            <svg className="mr-2 h-6 w-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
          )}
          Sign in with Google
        </button>
      </div>
    </div>
  );
} 