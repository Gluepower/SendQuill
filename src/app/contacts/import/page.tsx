'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

interface ParsedData {
  headers: string[];
  rows: string[][];
}

export default function ImportContactsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get('listId');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [emailColumnIndex, setEmailColumnIndex] = useState<number>(-1);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    total: number;
    errors?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split(/\r\n|\n/);
      
      if (lines.length < 2) {
        setError('CSV file must contain a header row and at least one data row');
        return;
      }
      
      // Extract headers (first row)
      const headers = lines[0].split(',').map(header => header.trim());
      
      if (headers.length === 0) {
        setError('CSV file must contain at least one column header');
        return;
      }
      
      // Extract data rows
      const rows = lines.slice(1)
        .filter(line => line.trim() !== '') // Skip empty lines
        .map(line => {
          // Handle quoted values with commas inside
          const values: string[] = [];
          let currentValue = '';
          let insideQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          
          // Add the last value
          values.push(currentValue.trim());
          
          // Ensure we have the same number of values as headers
          while (values.length < headers.length) {
            values.push('');
          }
          
          return values.slice(0, headers.length);
        });
      
      setParsedData({ headers, rows });
      
      // Try to automatically detect email column
      const emailHeaderIndex = headers.findIndex(header => 
        header.toLowerCase().includes('email')
      );
      
      if (emailHeaderIndex !== -1) {
        setEmailColumnIndex(emailHeaderIndex);
      }
    };
    
    reader.readAsText(file);
  };

  const handleSelectEmailColumn = (index: number) => {
    setEmailColumnIndex(index);
  };

  const handleColumnMappingChange = (columnIndex: number, fieldName: string) => {
    const newMappings = { ...columnMappings };
    
    if (fieldName === '') {
      delete newMappings[columnIndex];
    } else {
      newMappings[columnIndex] = fieldName;
    }
    
    setColumnMappings(newMappings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData || !listId || emailColumnIndex === -1) {
      setError("Please upload a CSV file and select the email column");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log("Starting bulk import process");
      console.log(`List ID: ${listId}, Total rows: ${parsedData.rows.length}, Email column: ${emailColumnIndex}`);
      
      // Ensure we have authentication
      if (!user || !user.uid) {
        setError("You must be logged in to import contacts. Please refresh the page and try again.");
        setIsSubmitting(false);
        return;
      }
      
      // Map the CSV data to the contacts format (with email and fields)
      const contacts = parsedData.rows
        .map((row) => {
          const email = row[emailColumnIndex];
          const fields: Record<string, string> = {};
          
          // Collect all other columns as fields
          Object.keys(columnMappings).forEach((colIndex) => {
            const columnIdx = parseInt(colIndex, 10);
            if (columnIdx !== emailColumnIndex && columnMappings[colIndex]) {
              fields[columnMappings[colIndex]] = row[columnIdx];
            }
          });
          
          return { email, ...fields };
        })
        .filter(contact => contact.email && typeof contact.email === 'string' && contact.email.includes('@'));
      
      if (contacts.length === 0) {
        setError("No valid contacts found in the CSV file. Make sure the email column is correct.");
        setIsSubmitting(false);
        return;
      }
      
      console.log(`Found ${contacts.length} valid contacts to import`);

      // Limit the payload to a reasonable size (100 contacts) to avoid issues
      const contactsToImport = contacts.slice(0, 100);
      console.log(`Sending first ${contactsToImport.length} contacts to the server`);
      
      // Get the auth token
      const token = await user.getIdToken();
      
      // Log the data being sent for debugging
      console.log("Request payload:", JSON.stringify({
        listId,
        contacts: contactsToImport
      }).substring(0, 200) + "...");
      
      // Attempt import with retries
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retryCount < maxRetries && !success) {
        try {
          console.log(`Import attempt ${retryCount + 1}/${maxRetries}`);
          
          console.log("Attempting to fetch with the following URL and options:");
          console.log("URL:", "/api/contacts/bulk-import");
          console.log("Options:", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            credentials: 'include'
          });
          
          const response = await fetch("/api/contacts/bulk-import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              listId,
              contacts: contactsToImport
            }),
            credentials: 'include'
          }).catch(error => {
            console.error("Network-level fetch error:", error);
            throw new Error(`Network error: ${error.message}`);
          });

          console.log(`Response status: ${response.status}`);
          const responseText = await response.text();
          console.log(`Response body: ${responseText}`);
          
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (parseError) {
            console.error("Failed to parse response as JSON:", parseError);
            if (response.status === 401) {
              setError("Authentication failed. Please try signing out and signing in again.");
            } else if (response.status === 403) {
              setError("You don't have permission to access this contact list.");
            } else {
              setError(`Server error: ${responseText.substring(0, 100)}...`);
            }
            setIsSubmitting(false);
            return;
          }
          
          if (!response.ok) {
            const errorMessage = responseData?.error || 'An unexpected server error occurred';
            if (response.status === 401) {
              setError("Authentication failed. Please try signing out and signing in again.");
            } else if (response.status === 403) {
              setError("You don't have permission to access this contact list.");
            } else {
              setError(errorMessage);
            }
            setIsSubmitting(false);
            return;
          }
          
          success = true;
          setSuccessMessage(`Successfully imported ${responseData.createdContacts} contacts. ${responseData.invalidContacts} were invalid.`);
          
          // Clear the form
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setParsedData(null);
          setFile(null);
          setEmailColumnIndex(-1);
          setColumnMappings({});
          setIsSubmitting(false);
          router.refresh();
          
        } catch (fetchError: any) {
          retryCount++;
          console.error(`Attempt ${retryCount} failed:`, fetchError);
          
          if (retryCount >= maxRetries) {
            console.error("Max retries reached. Import failed.");
            throw fetchError;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error: any) {
      console.error("Error importing contacts:", error);
      setError(`Error importing contacts: ${error.message || 'An unexpected error occurred'}`);
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
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">Import Contacts</h2>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-6 rounded-md bg-green-50 p-4">
                <h3 className="text-lg font-medium text-green-800">Import Results</h3>
                <div className="mt-2 text-sm text-green-700">
                  {successMessage}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700">
                  CSV File <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    id="csvFile"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:rounded-md file:border-0
                      file:bg-blue-50 file:px-4 file:py-2
                      file:text-sm file:font-semibold
                      file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Upload a CSV file with headers. The file should have at least one column with email addresses.
                </p>
              </div>

              {parsedData && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Configure Import</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Email Column <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <select
                        value={emailColumnIndex}
                        onChange={(e) => handleSelectEmailColumn(parseInt(e.target.value))}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        required
                      >
                        <option value="-1">Select email column</option>
                        {parsedData.headers.map((header, index) => (
                          <option key={index} value={index}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Map Additional Columns to Fields (Optional)
                    </label>
                    <div className="mt-2 space-y-3">
                      {parsedData.headers.map((header, index) => {
                        if (index === emailColumnIndex) return null;
                        
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-1/3">
                              <span className="text-sm text-gray-700">{header}</span>
                            </div>
                            <div className="w-2/3">
                              <input
                                type="text"
                                placeholder="Map to field name (leave empty to skip)"
                                value={columnMappings[index] || ''}
                                onChange={(e) => handleColumnMappingChange(index, e.target.value)}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {parsedData.headers.map((header, index) => (
                            <th 
                              key={index}
                              className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                index === emailColumnIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-500'
                              }`}
                            >
                              {header}
                              {index === emailColumnIndex && ' (Email)'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td 
                                key={cellIndex}
                                className={`whitespace-nowrap px-3 py-2 text-sm ${
                                  cellIndex === emailColumnIndex ? 'text-blue-700' : 'text-gray-500'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.rows.length > 5 && (
                      <div className="bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                        Showing 5 of {parsedData.rows.length} rows
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  href={`/contacts/lists/${listId}`}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || !file || emailColumnIndex === -1}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Importing...' : 'Import Contacts'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
} 