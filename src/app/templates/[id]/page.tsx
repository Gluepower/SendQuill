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
  content: string;
  createdAt: string;
  updatedAt: string;
};

export default function TemplateDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
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
        if (!params.id) {
          setError('Invalid template ID');
          setIsLoadingTemplate(false);
          return;
        }

        console.log('Fetching template with ID:', params.id);
        const response = await fetch(`/api/templates/${params.id}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Failed to fetch template (status: ${response.status})`;
          
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // If it's not JSON, check if it's HTML (likely an error page)
            if (errorText.includes('<html')) {
              console.error('Received HTML instead of JSON:', errorText.substring(0, 100) + '...');
              
              if (response.status === 404) {
                errorMessage = 'Template not found. It may have been deleted.';
              } else if (response.status === 401 || response.status === 403) {
                errorMessage = 'You do not have permission to view this template.';
              } else {
                errorMessage = 'Server error occurred. Please try again later.';
              }
            }
          }
          
          setError(errorMessage);
          setIsLoadingTemplate(false);
          return;
        }
        
        // First get the text
        const responseText = await response.text();
        
        // Try to parse as JSON
        try {
          const data = JSON.parse(responseText);
          setTemplate(data);
          setError(null);
        } catch (parseError) {
          console.error('Error parsing template JSON:', parseError);
          console.error('Received data:', responseText.substring(0, 100) + '...');
          setError('Error parsing response data. Please try again later.');
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        setError('An error occurred while fetching the template. Please check your connection and try again.');
      } finally {
        setIsLoadingTemplate(false);
      }
    }

    if (isAuthenticated && params.id) {
      fetchTemplate();
    } else if (!isLoading && !isAuthenticated) {
      setIsLoadingTemplate(false);
    }
  }, [isAuthenticated, isLoading, params.id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        const response = await fetch(`/api/templates/${params.id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          router.push('/templates');
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to delete template');
        }
      } catch (error) {
        console.error('Error deleting template:', error);
        setError('An error occurred while deleting the template');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark:bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
      </div>
    );
  }

  return (
    <PageLayout showBackToDashboard={true}>
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

      {isLoadingTemplate ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
          {error}
          <div className="mt-4">
            <Link
              href="/templates"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Return to Templates
            </Link>
          </div>
        </div>
      ) : template ? (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{template.name}</h2>
              {template.description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
              )}
            </div>
            <div className="flex space-x-2">
              <Link
                href={`/campaigns/new?templateId=${template.id}`}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-700 dark:hover:bg-green-600"
              >
                Use in Campaign
              </Link>
              <Link
                href={`/templates/${template.id}/edit`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Edit Template
              </Link>
              <button
                onClick={handleDelete}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-dark-card dark:border-red-700/50 dark:text-red-400 dark:hover:bg-red-700/20"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Template Preview */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:bg-dark-card dark:border-dark-accent">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Template Preview</h3>
            <div 
              className="prose prose-blue max-w-none dark:prose-invert" 
              dangerouslySetInnerHTML={{ __html: template.content }}
            ></div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
          Template not found
        </div>
      )}
    </PageLayout>
  );
}

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