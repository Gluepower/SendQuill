'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import PageLayout from '@/app/components/PageLayout';
import Cookies from 'js-cookie';
import DeleteConfirmationModal from '@/app/components/DeleteConfirmationModal';
import { useNotification } from '@/lib/contexts/NotificationContext';

// Simple date formatter
const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  subject: string;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    name: string;
  } | null;
  contactList: {
    id: string;
    name: string;
  } | null;
};

export default function CampaignsPage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isDataDiscrepancy, setIsDataDiscrepancy] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState<Record<string, boolean>>({});
  const { showNotification } = useNotification();

  // Gmail reconnection handler
  const handleGmailReconnect = async () => {
    try {
      await signInWithGoogle();
      // Check if authentication succeeded
      setTimeout(() => {
        const gmailToken = Cookies.get('gmail-token');
        setIsGmailConnected(!!gmailToken);
        if (gmailToken) {
          alert('Successfully connected to Gmail! You can now send emails.');
        } else {
          alert('Failed to connect to Gmail. Please try again and ensure you grant the necessary permissions.');
        }
      }, 1000);
    } catch (error) {
      console.error('Error connecting to Gmail:', error);
      alert('Failed to connect to Gmail. Please try again.');
    }
  };

  // Add function to handle data reset
  const handleResetData = async () => {
    if (confirm('This will reset the analytics data to match your actual campaigns. Continue?')) {
      try {
        const response = await fetch('/api/analytics/reset', {
          method: 'POST',
        });
        
        if (response.ok) {
          alert('Data has been reset successfully!');
          window.location.reload();
        } else {
          alert('Failed to reset data. Please try again.');
        }
      } catch (error) {
        console.error('Error resetting data:', error);
        alert('An error occurred while resetting data.');
      }
    }
  };

  // Delete campaign handler
  const handleDelete = async (id: string) => {
    setCampaignToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete handler
  const confirmDelete = async () => {
    if (!campaignToDelete) return;
    
    try {
      const response = await fetch(`/api/campaigns/${campaignToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the deleted campaign from state
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignToDelete));
      } else {
        const error = await response.json();
        console.error('Failed to delete campaign:', error);
        alert('Failed to delete campaign. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('An error occurred while deleting the campaign. Please try again.');
    } finally {
      setIsDeleteModalOpen(false);
      setCampaignToDelete(null);
    }
  };

  // Send now handler
  const handleSendNow = async (campaignId: string) => {
    if (confirm('Are you sure you want to send this campaign now?')) {
      try {
        // Get Gmail access token from cookie
        const accessToken = Cookies.get('gmail-token');
        
        if (!accessToken) {
          alert('Gmail authentication is required. Please sign in with Google first.');
          return;
        }
        
        const response = await fetch(`/api/campaigns/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            campaignId, 
            accessToken,
            trackOpens: true, 
            trackClicks: true 
          }),
        });

        if (response.ok) {
          alert('Campaign is being sent!');
          // Update the campaign status in the UI
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === campaignId ? { ...c, status: 'SENDING' } : c
            )
          );
        } else {
          const errorData = await response.json();
          alert(errorData.error || 'Failed to send campaign');
        }
      } catch (error) {
        console.error('Error sending campaign:', error);
        alert('An error occurred while sending the campaign');
      }
    }
  };

  // Copy campaign handler
  const handleCopy = async (campaignId: string) => {
    // Set copying state for this campaign
    setIsCopying(prev => ({ ...prev, [campaignId]: true }));
    
    try {
      const response = await fetch('/api/campaigns/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
      });

      if (response.ok) {
        const newCampaign = await response.json();
        // Add the new campaign to the state
        setCampaigns((prevCampaigns) => [newCampaign, ...prevCampaigns]);
        // Show success notification
        showNotification('success', 'Campaign Copied', `Campaign has been copied as "${newCampaign.name}"`);
      } else {
        const error = await response.json();
        console.error('Failed to copy campaign:', error);
        // Show error notification
        showNotification('error', 'Copy Failed', error.error || 'Failed to copy campaign');
      }
    } catch (error) {
      console.error('Error copying campaign:', error);
      // Show error notification
      showNotification('error', 'Copy Failed', 'An error occurred while copying the campaign');
    } finally {
      // Clear copying state for this campaign
      setIsCopying(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Check if Gmail is connected
    const gmailToken = Cookies.get('gmail-token');
    setIsGmailConnected(!!gmailToken);
  }, []);

  useEffect(() => {
    // Fetch campaigns when the component mounts or filter changes
    async function fetchCampaigns() {
      try {
        const url = statusFilter
          ? `/api/campaigns?status=${statusFilter}`
          : '/api/campaigns';
          
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data);
          
          // Also fetch analytics data to check for discrepancies
          const analyticsResponse = await fetch('/api/analytics?period=all');
          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            setAnalyticsData(analyticsData);
            
            // Check if there's a discrepancy between actual campaigns count and what analytics shows
            if (data.length === 0 && analyticsData.summary.totalCampaigns > 0) {
              setIsDataDiscrepancy(true);
            } else {
              setIsDataDiscrepancy(false);
            }
          }
        } else {
          console.error('Failed to fetch campaigns');
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setIsLoadingCampaigns(false);
      }
    }

    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [isAuthenticated, statusFilter]);

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
        {/* Gmail Authentication Warning */}
        {!isGmailConnected && (
          <div className="mb-6 rounded-lg bg-yellow-100 p-4 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p>
                  <strong>Gmail authentication required.</strong> You need to sign in with Google to send emails.
                </p>
              </div>
              <button
                onClick={handleGmailReconnect}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Connect Gmail
              </button>
            </div>
          </div>
        )}

        {/* Data discrepancy warning */}
        {isDataDiscrepancy && (
          <div className="w-full rounded-lg bg-red-50 p-4 dark:bg-red-900/20 md:max-w-md">
            <div className="flex items-start">
              <svg className="mr-2 h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Data Inconsistency Detected</h3>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                  Dashboard shows {analyticsData?.summary.totalCampaigns} campaigns, but you have {campaigns.length} actual campaigns.
                </p>
                <button
                  onClick={handleResetData}
                  className="mt-2 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                >
                  Reset Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Email Campaigns</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage your email campaigns</p>
          </div>
          <Link
            href="/campaigns/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Create Campaign
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`rounded-lg px-3 py-1 text-sm ${
              statusFilter === null
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`rounded-lg px-3 py-1 text-sm ${
              statusFilter === 'DRAFT'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70'
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setStatusFilter('SCHEDULED')}
            className={`rounded-lg px-3 py-1 text-sm ${
              statusFilter === 'SCHEDULED'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setStatusFilter('SENDING')}
            className={`rounded-lg px-3 py-1 text-sm ${
              statusFilter === 'SENDING'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70'
            }`}
          >
            Sending
          </button>
          <button
            onClick={() => setStatusFilter('SENT')}
            className={`rounded-lg px-3 py-1 text-sm ${
              statusFilter === 'SENT'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70'
            }`}
          >
            Sent
          </button>
        </div>

        {/* Campaigns List */}
        {isLoadingCampaigns ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
          </div>
        ) : campaigns.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:bg-dark-card dark:border-dark-accent">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-accent">
              <thead className="bg-gray-50 dark:bg-dark-accent">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Campaign
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Template
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Contact List
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Created
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-dark-accent dark:bg-dark-card">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-dark-accent/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link href={`/campaigns/${campaign.id}`} className="block">
                        <div className="font-medium text-gray-900 dark:text-white">{campaign.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{campaign.subject}</div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <CampaignStatusBadge status={campaign.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {campaign.template ? campaign.template.name : 'Not selected'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {campaign.contactList ? campaign.contactList.name : 'Not selected'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(campaign.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <Link
                          href={`/campaigns/${campaign.id}/edit`}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50"
                        >
                          Edit
                        </Link>
                        {campaign.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSendNow(campaign.id)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-800/50"
                          >
                            Send
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(campaign.id)}
                          disabled={isCopying[campaign.id]}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-800/50 disabled:opacity-50"
                        >
                          {isCopying[campaign.id] ? 'Copying...' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-800/50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-8 text-center dark:bg-dark-card dark:border-dark-accent">
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">No campaigns found</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              {statusFilter ? `No campaigns with status "${statusFilter.toLowerCase()}" found.` : 'Create your first email campaign to get started'}
            </p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Create Campaign
            </Link>
          </div>
        )}
      </div>

      {/* Add DeleteConfirmationModal at the end of the component */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Campaign"
        message="Are you sure you want to delete this campaign? This action cannot be undone."
      />
    </PageLayout>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';
  let darkBgColor = 'dark:bg-gray-700';
  let darkTextColor = 'dark:text-gray-300';

  switch (status) {
    case 'DRAFT':
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      darkBgColor = 'dark:bg-gray-700';
      darkTextColor = 'dark:text-gray-300';
      break;
    case 'SCHEDULED':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      darkBgColor = 'dark:bg-yellow-900/30';
      darkTextColor = 'dark:text-yellow-300';
      break;
    case 'SENDING':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      darkBgColor = 'dark:bg-blue-900/30';
      darkTextColor = 'dark:text-blue-300';
      break;
    case 'SENT':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      darkBgColor = 'dark:bg-green-900/30';
      darkTextColor = 'dark:text-green-300';
      break;
    case 'FAILED':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      darkBgColor = 'dark:bg-red-900/30';
      darkTextColor = 'dark:text-red-300';
      break;
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${bgColor} ${textColor} ${darkBgColor} ${darkTextColor}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
} 