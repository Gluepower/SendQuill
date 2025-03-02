'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

interface FormField {
  name: string;
  value: string;
}

export default function NewContactPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get('listId');

  const [email, setEmail] = useState('');
  const [customFields, setCustomFields] = useState<FormField[]>([{ name: '', value: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!listId && !isLoading && isAuthenticated) {
      router.push('/contacts');
    }
  }, [listId, isAuthenticated, isLoading, router]);

  const handleFieldNameChange = (index: number, value: string) => {
    const newFields = [...customFields];
    newFields[index].name = value;
    setCustomFields(newFields);
  };

  const handleFieldValueChange = (index: number, value: string) => {
    const newFields = [...customFields];
    newFields[index].value = value;
    setCustomFields(newFields);
  };

  const addField = () => {
    setCustomFields([...customFields, { name: '', value: '' }]);
  };

  const removeField = (index: number) => {
    if (customFields.length === 1) {
      setCustomFields([{ name: '', value: '' }]);
    } else {
      const newFields = customFields.filter((_, i) => i !== index);
      setCustomFields(newFields);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Convert custom fields to an object
    const fieldsObj: Record<string, string> = {};
    customFields.forEach((field) => {
      if (field.name.trim() && field.value.trim()) {
        fieldsObj[field.name.trim()] = field.value.trim();
      }
    });

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listId,
          email: email.trim(),
          fields: fieldsObj,
        }),
      });

      if (response.ok) {
        router.push(`/contacts/lists/${listId}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create contact');
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !listId) {
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
            href={`/contacts/lists/${listId}`}
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
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">Add New Contact</h2>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Fields
                  </label>
                  <button
                    type="button"
                    onClick={addField}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Field
                  </button>
                </div>

                <div className="space-y-3">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Field Name"
                          value={field.name}
                          onChange={(e) => handleFieldNameChange(index, e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Value"
                          value={field.value}
                          onChange={(e) => handleFieldValueChange(index, e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  href={`/contacts/lists/${listId}`}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
} 