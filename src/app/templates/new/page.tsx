'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PageLayout from '@/app/components/PageLayout';

// Import React Quill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function NewTemplatePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

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
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/templates/${data.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark:bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
      </div>
    );
  }

  return (
    <PageLayout showBackToDashboard>
      {/* Main Content */}
      <div>
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href="/templates"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Templates
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create New Template</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Design an email template with placeholders for personalization</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900/30">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Template Form */}
        <form onSubmit={handleSubmit} className="mt-6 max-w-4xl">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Template Name */}
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Template Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-dark-accent dark:border-dark-accent dark:text-white"
                  placeholder="e.g. Welcome Email"
                />
              </div>
            </div>

            {/* Template Description */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-dark-accent dark:border-dark-accent dark:text-white"
                  placeholder="Optional template description"
                />
              </div>
            </div>

            {/* Placeholder Buttons */}
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Insert Placeholder
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => insertPlaceholder('firstName')}
                  className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-dark-card dark:border-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent"
                >
                  First Name
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('lastName')}
                  className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-dark-card dark:border-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent"
                >
                  Last Name
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('email')}
                  className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-dark-card dark:border-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent"
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('company')}
                  className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-dark-card dark:border-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent"
                >
                  Company
                </button>
              </div>
            </div>

            {/* Template Content */}
            <div className="sm:col-span-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Content
              </label>
              <div className="mt-1">
                <ReactQuill 
                  value={formData.content} 
                  onChange={handleEditorChange} 
                  modules={modules}
                  theme="snow"
                  className="h-64 bg-white dark:bg-dark-card"
                  placeholder="Compose your email template here... Use placeholders for personalization."
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Use the format &#123;&#123; placeholder &#125;&#125; to add dynamic content that will be replaced with recipient data.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex items-center justify-end space-x-3">
            <Link
              href="/templates"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-dark-card dark:border-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {isSubmitting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
} 