'use client';

import { useState } from 'react';

export default function TestApi() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const testHealthEndpoint = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health');
      const text = await response.text();
      
      setResult(`Status: ${response.status}\nResponse: ${text}`);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const testBulkImportEndpoint = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/contacts/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString()
        })
      });
      
      const text = await response.text();
      setResult(`Status: ${response.status}\nResponse: ${text}`);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Testing Page</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Health Endpoint</h2>
          <button 
            onClick={testHealthEndpoint}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Health Endpoint'}
          </button>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Bulk Import Endpoint</h2>
          <button 
            onClick={testBulkImportEndpoint}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Bulk Import Endpoint'}
          </button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}
        
        {result && (
          <div className="p-4 bg-gray-100 rounded">
            <pre>{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 