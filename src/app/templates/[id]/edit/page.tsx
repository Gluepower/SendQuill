'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Import React Quill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

type Template = {
  id: string;
  name: string;
  description: string | null;
  content: string;
};

export default function EditTemplatePage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<Template>({
    id: '',
    name: '',
    description: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Fetch template when the component mounts
    async function fetchTemplate() {
      try {
        const response = await fetch(`/api/templates/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            id: data.id,
            name: data.name,
            description: data.description || '',
            content: data.content,
          });
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch template');
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        setError('An error occurred while fetching the template');
      } finally {
        setIsLoadingTemplate(false);
      }
    }

    if (isAuthenticated && params.id) {
      fetchTemplate();
    }
  }, [isAuthenticated, params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditorChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Template name is required');
      }

      if (!formData.content.trim()) {
        throw new Error('Template content is required');
      }

      // Submit the form data
      const response = await fetch(`/api/templates/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push(`/templates/${params.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update template');
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom toolbar options for the editor
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  // Placeholder insertion helper
  const insertPlaceholder = (placeholder: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + ` {{${placeholder}}} `,
    }));
  };

  if (isLoading || isLoadingTemplate) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (error && !formData.id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">SendQuill</h1>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-gray-50 p-4">
          <nav className="space-y-1">
            <NavItem href="/dashboard" label="Dashboard" />
            <NavItem href="/contacts" label="Contacts" />
            <NavItem href="/templates" label="Templates" isActive />
            <NavItem href="/campaigns" label="Campaigns" />
            <NavItem href="/sequences" label="Follow-ups" />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Back Button */}
          <div className="mb-4">
            <Link
              href={`/templates/${params.id}`}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Template
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Edit Template</h2>
            <p className="text-sm text-gray-600">Update your email template</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Template Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Template Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              {/* Template Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Placeholder Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Insert Placeholders
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => insertPlaceholder('firstName')}
                  className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                >
                  {'{{'} firstName {'}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('lastName')}
                  className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                >
                  {'{{'} lastName {'}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('email')}
                  className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                >
                  {'{{'} email {'}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('company')}
                  className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                >
                  {'{{'} company {'}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('phone')}
                  className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                >
                  {'{{'} phone {'}}'}
                </button>
              </div>
            </div>

            {/* Template Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                Template Content <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <ReactQuill
                  value={formData.content}
                  onChange={handleEditorChange}
                  modules={modules}
                  className="h-64 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Use the buttons above to insert placeholders for personalized content.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <Link
                href={`/templates/${params.id}`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, label, isActive }: { href: string; label: string; isActive?: boolean }) {
  return (
    <a
      href={href}
      className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </a>
  );
} 