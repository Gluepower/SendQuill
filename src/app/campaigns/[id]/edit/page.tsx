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
import '../../new/quill-dark.css'; // Import custom dark mode styles for ReactQuill

type Template = {
  id: string;
  name: string;
  description: string | null;
  content?: string;
};

type ContactList = {
  id: string;
  name: string;
  description: string | null;
};

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  templateId: string;
  contactListId: string;
};

export default function EditCampaignPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<Campaign>({
    id: '',
    name: '',
    description: '',
    subject: '',
    content: '',
    status: '',
    scheduledAt: null,
    templateId: '',
    contactListId: '',
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Fetch campaign, templates, and contact lists when the component mounts
    async function fetchData() {
      try {
        const [campaignResponse, templatesResponse, contactListsResponse] = await Promise.all([
          fetch(`/api/campaigns/${params.id}`),
          fetch('/api/templates'),
          fetch('/api/contact-lists'),
        ]);

        if (campaignResponse.ok && templatesResponse.ok && contactListsResponse.ok) {
          const [campaignData, templatesData, contactListsData] = await Promise.all([
            campaignResponse.json(),
            templatesResponse.json(),
            contactListsResponse.json(),
          ]);

          // Format the date for the form
          let scheduledFor = '';
          if (campaignData.scheduledAt) {
            const date = new Date(campaignData.scheduledAt);
            scheduledFor = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
              .toISOString()
              .slice(0, 16);
          }

          setFormData({
            id: campaignData.id,
            name: campaignData.name,
            description: campaignData.description || '',
            subject: campaignData.subject,
            content: campaignData.content,
            status: campaignData.status,
            scheduledAt: scheduledFor,
            templateId: campaignData.templateId,
            contactListId: campaignData.contactLists[0]?.id || '',
          });

          setTemplates(templatesData);
          setContactLists(contactListsData);
          
          // Set the selected template
          const selectedTemplate = templatesData.find((t: Template) => t.id === campaignData.templateId);
          if (selectedTemplate) {
            setSelectedTemplate(selectedTemplate);
          }
        } else {
          const errorData = await (campaignResponse.ok 
            ? (templatesResponse.ok ? contactListsResponse.json() : templatesResponse.json())
            : campaignResponse.json());
          setError(errorData.error || 'Failed to load data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An error occurred while loading data');
        }
      } finally {
        setIsLoadingData(false);
      }
    }

    if (isAuthenticated && params.id) {
      fetchData();
    }
  }, [isAuthenticated, params.id]);

  // Fetch template content when template selection changes
  const fetchTemplateContent = async (templateId: string) => {
    if (!templateId) return;
    
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (response.ok) {
        const templateData = await response.json();
        setSelectedTemplate(templateData);
        // Only update content if the user hasn't modified it
        if (formData.content === selectedTemplate?.content) {
          setFormData(prev => ({ ...prev, content: templateData.content }));
        }
      } else {
        const errorData = await response.json();
        console.error('Error fetching template:', errorData.error);
      }
    } catch (error) {
      console.error('Error fetching template content:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // If template selection changes, fetch the template content
    if (name === 'templateId' && value) {
      fetchTemplateContent(value);
    }
  };

  const handleEditorChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  const handleSubmit = async (e: React.FormEvent, sendNow = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Campaign name is required');
      }

      if (!formData.subject.trim()) {
        throw new Error('Email subject is required');
      }

      if (!formData.templateId) {
        throw new Error('Please select a template');
      }

      if (!formData.contactListId) {
        throw new Error('Please select a contact list');
      }

      // Prevent editing campaigns that are already sent or sending
      if (formData.status === 'SENT' || formData.status === 'SENDING') {
        throw new Error('Cannot edit a campaign that has already been sent or is currently sending');
      }

      // Prepare scheduledFor date
      let scheduledFor: string | null = null;
      if (formData.scheduledAt) {
        scheduledFor = new Date(formData.scheduledAt).toISOString();
      }

      // Determine status based on action
      let status = formData.status;
      if (sendNow) {
        status = 'SENDING';
        scheduledFor = new Date().toISOString();
      } else if (status === 'DRAFT' && scheduledFor) {
        status = 'SCHEDULED';
      }

      // Submit the form data
      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          subject: formData.subject,
          content: formData.content,
          templateId: formData.templateId,
          contactListId: formData.contactListId,
          scheduledFor,
          status,
        }),
      });

      if (response.ok) {
        router.push(`/campaigns/${params.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update campaign');
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
      content: prev.content + ` {{${placeholder}}} `
    }));
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="mb-4">
        <Link
          href={`/campaigns/${params.id}`}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Campaign
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Campaign Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Campaign Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Campaign Name <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
              required
            />
          </div>

          {/* Email Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Subject <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Description (Optional) */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
          />
        </div>

        {/* Template Selection */}
        <div>
          <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Template <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            id="templateId"
            name="templateId"
            value={formData.templateId}
            onChange={(e) => {
              handleChange(e);
              fetchTemplateContent(e.target.value);
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
            required
          >
            <option value="">Select a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex justify-end">
            <Link
              href="/templates/new"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Create new template
            </Link>
          </div>
        </div>

        {/* Contact List Selection */}
        <div>
          <label htmlFor="contactListId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Contact List <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            id="contactListId"
            name="contactListId"
            value={formData.contactListId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
            required
          >
            <option value="">Select a contact list</option>
            {contactLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex justify-end">
            <Link
              href="/contacts/lists/new"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Create new list
            </Link>
          </div>
        </div>

        {/* Schedule Date and Time (Optional) */}
        <div>
          <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schedule Date and Time (Optional)
          </label>
          <input
            type="datetime-local"
            id="scheduledAt"
            name="scheduledAt"
            value={formData.scheduledAt || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave blank to save as draft. You can schedule the campaign later.</p>
        </div>

        {/* Email Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Content <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <div className="mt-1">
            {/* Placeholder Buttons */}
            <div className="mb-2">
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Insert Placeholders:</p>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => insertPlaceholder('firstName')}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70"
                >
                  {'{{'} firstName {'}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('lastName')}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70"
                >
                  {'{{'} lastName {'}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('email')}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70"
                >
                  {'{{'} email {'}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('company')}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70"
                >
                  {'{{'} company {'}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('phone')}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70"
                >
                  {'{{'} phone {'}}'}
                </button>
              </div>
            </div>
            
            {/* Rich Text Editor */}
            <div className="editor-container rounded-md border border-gray-300 shadow-sm dark:border-dark-accent">
              <ReactQuill
                value={formData.content}
                onChange={handleEditorChange}
                modules={modules}
                className="min-h-[200px] dark:bg-dark-card dark:text-white dark:border-dark-accent"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use the buttons above to insert placeholders for personalized content.</p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => router.push(`/campaigns/${params.id}`)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-dark-accent dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-accent/70"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </PageLayout>
  );
} 