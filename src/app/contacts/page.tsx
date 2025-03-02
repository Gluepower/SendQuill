'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import PageLayout from '@/app/components/PageLayout';

// This is a placeholder until we implement the actual data fetching
type ContactList = {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
};

function NavItem({ href, label, isActive }: { href: string; label: string; isActive?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );
}

export default function ContactsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Fetch contact lists when the component mounts
    async function fetchContactLists() {
      try {
        const response = await fetch('/api/contact-lists');
        if (response.ok) {
          const data = await response.json();
          setContactLists(data);
        } else {
          console.error('Failed to fetch contact lists');
        }
      } catch (error) {
        console.error('Error fetching contact lists:', error);
      } finally {
        setIsLoadingLists(false);
      }
    }

    if (isAuthenticated) {
      fetchContactLists();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark:bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageLayout>
      {/* Main Content */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Contact Lists</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage your contact lists and organize recipients</p>
          </div>
          <Link
            href="/contacts/lists/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Create New List
          </Link>
        </div>

        {/* Lists Grid */}
        {isLoadingLists ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
          </div>
        ) : contactLists.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Map through contact lists */}
            {contactLists.map((list) => (
              <div
                key={list.id}
                className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-dark-card dark:border-dark-accent dark:hover:bg-dark-accent/70"
                onClick={() => router.push(`/contacts/lists/${list.id}`)}
              >
                <div className="flex justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{list.name}</h3>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-dark-accent dark:text-gray-300">
                    {list.contactCount} contacts
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {list.description || 'No description'}
                </p>
                <div className="mt-4 flex items-center justify-end space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/contacts/lists/${list.id}/edit`);
                    }}
                    className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/contacts/import?listId=${list.id}`);
                    }}
                    className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                  >
                    Import
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-8 text-center dark:bg-dark-card dark:border-dark-accent">
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">No contact lists found</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">Create your first contact list to get started</p>
            <Link
              href="/contacts/lists/new"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Create Contact List
            </Link>
          </div>
        )}
      </div>
    </PageLayout>
  );
} 