'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import Image from "next/image";
import QuillLogo from "./components/QuillLogo";

export default function Home() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-gray-900 to-gray-950 px-4 text-white">
      <div className="my-16 text-center">
        <h1 className="mb-4 flex items-center justify-center gap-3 text-5xl font-bold tracking-tight">
          <QuillLogo className="h-10 w-10 text-blue-500" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">SendQuill</span>
        </h1>
        <p className="mb-8 text-xl text-gray-300">
          A modern mail merge application for personalized email campaigns
        </p>
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0">
          <button
            onClick={() => signInWithGoogle()}
            className="rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Get Started
          </button>
          <Link
            href="/signin"
            className="rounded-lg border border-gray-600 bg-gray-800 px-8 py-3 text-base font-medium text-gray-200 shadow-md transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Sign In
          </Link>
        </div>
      </div>
      
      <div className="grid max-w-6xl gap-8 py-8 md:grid-cols-3">
        <FeatureCard
          title="Personalized Emails"
          description="Create custom templates with dynamic placeholders for names, companies, and more."
          icon="📝"
        />
        <FeatureCard
          title="Contact Management"
          description="Import CSV files with custom fields, organize contacts into separate lists."
          icon="👥"
        />
        <FeatureCard
          title="Campaign Scheduling"
          description="Send emails immediately or schedule them for future delivery with follow-ups."
          icon="📅"
        />
      </div>
    </main>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="flex flex-col rounded-xl bg-gray-800 p-6 shadow-md transition-all hover:shadow-lg border border-gray-700">
      <div className="mb-4 text-3xl">{icon}</div>
      <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}
