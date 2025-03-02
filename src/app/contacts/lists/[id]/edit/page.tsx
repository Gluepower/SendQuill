'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

interface ContactList {
  id: string;
  name: string;
  description: string | null;
}

export default function EditContactListPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = params;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch contact list data
  useEffect(() => {
    async function fetchContactList() {
      try {
        setIsLoadingList(true);
        const response = await fetch(`/api/contact-lists/${id}`);
        
        if (response.ok) {
          const list: ContactList = await response.json();
          setName(list.name);
          setDescription(list.description || '');
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch contact list');
        }
      } catch (error) {
        console.error('Error fetching contact list:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoadingList(false);
      }
    }

    if (isAuthenticated && id) {
      fetchContactList();
    }
  }, [id, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/contact-lists/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (response.ok) {
        router.push(`/contacts/lists/${id}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update contact list');
      }
    } catch (error) {
      console.error('Error updating contact list:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isLoadingList) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">
            <Link href="/dashboard">SendQuill</Link>
          </h1>
          <Link
            href={`/contacts/lists/${id}`}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Contact List
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-gray-50 p-4">
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/contacts"
              className="flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
            >
              Contacts
            </Link>
            <Link
              href="/templates"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Templates
            </Link>
            <Link
              href="/campaigns"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Campaigns
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">Edit Contact List</h2>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  href={`/contacts/lists/${id}`}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
} 