'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

interface Contact {
  id: string;
  email: string;
  fields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  contacts: Contact[];
  createdAt: string;
  updatedAt: string;
}

export default function ContactListPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = params;

  const [contactList, setContactList] = useState<ContactList | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    async function fetchContactList() {
      try {
        setIsLoadingList(true);
        const response = await fetch(`/api/contact-lists/${id}`);
        if (response.ok) {
          const data = await response.json();
          setContactList(data);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allContactIds = contactList?.contacts.map((contact) => contact.id) || [];
      setSelectedContacts(allContactIds);
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleDeleteList = async () => {
    if (!contactList) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete the list "${contactList.name}" and all its contacts? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/contact-lists/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/contacts');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete contact list');
      }
    } catch (error) {
      console.error('Error deleting contact list:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteContacts = async () => {
    if (selectedContacts.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedContacts.length} selected contact(s)? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/contacts/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds: selectedContacts }),
      });
      
      if (response.ok) {
        // Refresh the contact list
        const listResponse = await fetch(`/api/contact-lists/${id}`);
        if (listResponse.ok) {
          const data = await listResponse.json();
          setContactList(data);
        }
        setSelectedContacts([]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete contacts');
      }
    } catch (error) {
      console.error('Error deleting contacts:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter contacts based on search term
  const filteredContacts = contactList?.contacts.filter(
    (contact) =>
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(contact.fields)
        .filter((value) => typeof value === 'string')
        .some((value) => (value as string).toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            href="/contacts"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Contacts
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
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {contactList ? (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{contactList.name}</h2>
                  {contactList.description && (
                    <p className="text-sm text-gray-600">{contactList.description}</p>
                  )}
                </div>
                <div className="flex space-x-3">
                  <Link
                    href={`/contacts/lists/${id}/edit`}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Edit List
                  </Link>
                  <button
                    onClick={handleDeleteList}
                    disabled={isDeleting}
                    className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Delete List
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    {contactList.contactCount} contacts
                  </span>
                  {selectedContacts.length > 0 && (
                    <button
                      onClick={handleDeleteContacts}
                      disabled={isDeleting}
                      className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Delete Selected ({selectedContacts.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-end space-x-3 md:flex-none md:justify-start">
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 md:w-64"
                  />
                  <Link
                    href={`/contacts/import?listId=${id}`}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Import Contacts
                  </Link>
                  <Link
                    href={`/contacts/new?listId=${id}`}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Add Contact
                  </Link>
                </div>
              </div>

              {filteredContacts && filteredContacts.length > 0 ? (
                <div className="mt-6 overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedContacts.length === contactList.contacts.length}
                            onChange={handleSelectAll}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Email
                        </th>
                        {contactList.contacts.length > 0 &&
                          Object.keys(contactList.contacts[0].fields).map((field) => (
                            <th
                              key={field}
                              scope="col"
                              className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                            >
                              {field}
                            </th>
                          ))}
                        <th
                          scope="col"
                          className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-3 py-4">
                            <input
                              type="checkbox"
                              checked={selectedContacts.includes(contact.id)}
                              onChange={() => handleSelectContact(contact.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {contact.email}
                          </td>
                          {Object.keys(contactList.contacts[0].fields).map((field) => (
                            <td
                              key={`${contact.id}-${field}`}
                              className="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                            >
                              {contact.fields[field] || '-'}
                            </td>
                          ))}
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <Link
                              href={`/contacts/${contact.id}/edit?listId=${id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-6 rounded-lg border bg-white p-8 text-center">
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No contacts found</h3>
                  <p className="mb-4 text-gray-500">
                    {searchTerm
                      ? 'No contacts match your search. Try different keywords.'
                      : 'This list has no contacts yet. Import contacts or add them manually.'}
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Link
                      href={`/contacts/import?listId=${id}`}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Import Contacts
                    </Link>
                    <Link
                      href={`/contacts/new?listId=${id}`}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Add Contact
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border bg-white p-8 text-center">
              <h3 className="mb-2 text-lg font-medium text-gray-900">Contact list not found</h3>
              <p className="mb-4 text-gray-500">
                The contact list you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link
                href="/contacts"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Back to Contacts
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 