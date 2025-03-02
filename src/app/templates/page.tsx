'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import PageLayout from '@/app/components/PageLayout';

type Template = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function TemplatesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Fetch templates when the component mounts
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/templates');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        } else {
          console.error('Failed to fetch templates');
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    }

    if (isAuthenticated) {
      fetchTemplates();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark:bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      {/* Main Content */}
      <div>
        {/* Templates Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Email Templates</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage your email templates</p>
          </div>
          <Link
            href="/templates/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Create Template
          </Link>
        </div>

        {/* Templates List */}
        {isLoadingTemplates ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
          </div>
        ) : templates.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-8 text-center dark:bg-dark-card dark:border-dark-accent">
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">No templates found</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">Create your first email template to get started</p>
            <Link
              href="/templates/new"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Create Template
            </Link>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/templates/${template.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Refresh the page to show updated list
          window.location.reload();
        } else {
          console.error('Failed to delete template');
        }
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  // Format date using the browser's built-in date formatter
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div 
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-dark-card dark:border-dark-accent dark:hover:bg-dark-accent/70"
      onClick={() => router.push(`/templates/${template.id}`)}
    >
      <div className="flex justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{template.name}</h3>
        <button
          onClick={handleDelete}
          className="invisible text-gray-400 hover:text-red-600 group-hover:visible dark:text-gray-500 dark:hover:text-red-400"
          aria-label="Delete template"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{template.description || 'No description'}</p>
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">Last updated: {formatDate(template.updatedAt)}</div>
    </div>
  );
} 