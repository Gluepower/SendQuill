'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PageLayout from '@/app/components/PageLayout';
import 'react-quill/dist/quill.snow.css';
import './quill-dark.css'; // Import custom dark mode styles for ReactQuill

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

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

export default function NewCampaignPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get('templateId');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    templateId: templateIdParam || '',
    contactListId: '',
    scheduledFor: '',
    content: '',
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [availableFields, setAvailableFields] = useState<string[]>(['email']);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Fetch templates and contact lists when the component mounts
    async function fetchData() {
      try {
        const [templatesResponse, contactListsResponse] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/contact-lists'),
        ]);

        if (templatesResponse.ok && contactListsResponse.ok) {
          const [templatesData, contactListsData] = await Promise.all([
            templatesResponse.json(),
            contactListsResponse.json(),
          ]);

          setTemplates(templatesData);
          setContactLists(contactListsData);

          // If a template ID was provided in the URL, select it
          if (templateIdParam) {
            const selectedTemplate = templatesData.find((t: Template) => t.id === templateIdParam);
            if (selectedTemplate) {
              setFormData((prev) => ({ ...prev, templateId: selectedTemplate.id }));
              
              // Fetch the template content
              await fetchTemplateContent(selectedTemplate.id);
            }
          }
        } else {
          const errorData = await (templatesResponse.ok ? contactListsResponse.json() : templatesResponse.json());
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

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, templateIdParam]);

  // Fetch template content when template selection changes
  const fetchTemplateContent = async (templateId: string) => {
    if (!templateId) return;
    
    try {
      console.log(`Fetching template content for ID: ${templateId}`);
      const response = await fetch(`/api/templates/${templateId}`);
      
      if (response.ok) {
        const templateData = await response.json();
        console.log('Template data received:', templateData);
        setSelectedTemplate(templateData);
        // Update the form data with the template content
        setFormData(prev => ({
          ...prev,
          content: templateData.content || ''
        }));
      } else {
        console.error(`Error fetching template: ${response.status}`);
        // If template is not found, set empty content or default content
        setFormData(prev => ({
          ...prev,
          content: prev.content || '<p>Enter your email content here.</p>'
        }));
        
        if (response.status === 404) {
          setError("Template not found. It may have been deleted.");
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Error details:', errorData);
        }
      }
    } catch (error) {
      console.error('Error fetching template content:', error);
      // Provide fallback content in case of error
      setFormData(prev => ({
        ...prev,
        content: prev.content || '<p>Enter your email content here.</p>'
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // If template selection changes, fetch the template content
    if (name === 'templateId' && value) {
      fetchTemplateContent(value);
    }

    // If the contact list ID changes, fetch the available fields
    if (name === 'contactListId' && value) {
      fetchContactListFields(value);
    }
  };

  const handleEditorChange = (content: string, delta: any, source: string, editor: any) => {
    setFormData(prev => ({
      ...prev,
      content: content || ''
    }));
    // Store the editor instance in a global variable for access in insertPlaceholder
    if (editor) {
      (window as any).quillEditor = editor;
    }
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = true, sendNow = false) => {
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

      // Prepare data for submission
      const submissionData = {
        ...formData,
        scheduledFor: saveAsDraft 
          ? null 
          : sendNow 
            ? new Date().toISOString() // Send immediately
            : formData.scheduledFor || new Date(Date.now() + 1000 * 60 * 5).toISOString(),
        status: sendNow ? 'SENDING' : (saveAsDraft ? 'DRAFT' : 'SCHEDULED')
      };

      // Submit the form data
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/campaigns/${data.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
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

  // Insert placeholder at cursor position using the Quill API
  const insertPlaceholder = (placeholder: string) => {
    try {
      const editor = (window as any).quillEditor;
      const placeholderText = `{{${placeholder}}}`;
      
      if (editor && editor.getSelection) {
        // Get the current selection
        const range = editor.getSelection();
        
        if (range) {
          // Insert at cursor position using the proper Quill API
          editor.deleteText(range.index, range.length);
          editor.insertText(range.index, placeholderText, 'user');
          // Move cursor after the inserted placeholder
          editor.setSelection(range.index + placeholderText.length, 0);
        } else {
          // If no selection, append to the end
          const length = editor.getLength();
          editor.insertText(length - 1, placeholderText, 'user');
          editor.setSelection(length - 1 + placeholderText.length, 0);
        }
      } else {
        // Fallback method if editor instance isn't available
        setFormData(prev => ({
          ...prev,
          content: prev.content + ` ${placeholderText} `
        }));
      }
    } catch (error) {
      console.error("Error inserting placeholder:", error);
      // Fallback to direct content manipulation if anything fails
      setFormData(prev => ({
        ...prev,
        content: prev.content + ` {{${placeholder}}} `
      }));
    }
  };

  // Add a new function to fetch contact list fields
  const fetchContactListFields = async (listId: string) => {
    try {
      console.log(`Fetching contact list fields for ${listId}`);
      const response = await fetch(`/api/contact-lists/${listId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Contact list data:', data);
        
        if (data.contacts && data.contacts.length > 0) {
          // Extract field names from the first contact
          const fields = data.contacts[0]?.fields ? Object.keys(data.contacts[0].fields) : [];
          // Always include email as a default field
          setAvailableFields(['email', ...fields]);
          console.log('Available fields updated:', ['email', ...fields]);
        } else {
          // Default to common fields if no contacts are found
          const defaultFields = ['email', 'name', 'firstName', 'lastName', 'city', 'state', 'country'];
          setAvailableFields(defaultFields);
          console.log('No contacts found, using default fields');
        }
      } else {
        // If we get a 404 or any error, use default common fields
        const defaultFields = ['email', 'name', 'firstName', 'lastName', 'city', 'state', 'country'];
        setAvailableFields(defaultFields);
        console.error('Error response from contact list API:', response.status);
      }
    } catch (error) {
      console.error('Error fetching contact list fields:', error);
      // Use fallback fields in case of any error
      const defaultFields = ['email', 'name', 'firstName', 'lastName', 'city', 'state', 'country'];
      setAvailableFields(defaultFields);
    }
  };

  if (isLoading || isLoadingData) {
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
          href="/campaigns"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Campaigns
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create New Campaign</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Set up a new email campaign to send to your contacts</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Campaign Form */}
      <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500 dark:placeholder-gray-500"
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
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
          />
        </div>

        {/* Email Template */}
        <div>
          <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Template <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            id="templateId"
            name="templateId"
            value={formData.templateId}
            onChange={(e) => {
              handleChange(e);
              if (e.target.value) {
                fetchTemplateContent(e.target.value);
              } else {
                setFormData(prev => ({ ...prev, content: '' }));
              }
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

        {/* Recipient List */}
        <div>
          <label htmlFor="contactListId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Recipient List <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            id="contactListId"
            name="contactListId"
            value={formData.contactListId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-dark-card dark:border-dark-accent dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
            required
          >
            <option value="">Select a recipient list</option>
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
          <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schedule Date and Time (Optional)
          </label>
          <input
            type="datetime-local"
            id="scheduledFor"
            name="scheduledFor"
            value={formData.scheduledFor}
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
                {availableFields.includes('email') && (
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('email')}
                    className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70"
                  >
                    {'{{'} email {'}}'}
                  </button>
                )}
                {availableFields.map(field => {
                  if (field === 'email') return null; // Skip email as it's already added
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => insertPlaceholder(field)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70"
                    >
                      {'{{' + ' ' + field + ' ' + '}}'}
                    </button>
                  );
                })}
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
            onClick={() => router.push('/campaigns')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-dark-accent dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-accent/70"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false, true)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-700 dark:hover:bg-green-600"
          >
            Send Now
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false, false)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Schedule Campaign
          </button>
        </div>
      </form>
    </PageLayout>
  );
} 