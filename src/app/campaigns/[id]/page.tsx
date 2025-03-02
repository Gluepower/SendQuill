'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { auth } from '@/lib/firebase/firebase';
import { processCampaign } from '@/lib/campaigns/processCampaign';
import PageLayout from '@/app/components/PageLayout';
import Cookies from 'js-cookie';
import DeleteConfirmationModal from '@/app/components/DeleteConfirmationModal';
import { useNotification } from '@/lib/contexts/NotificationContext';
import StatusNotification from '@/app/components/StatusNotification';

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  subject: string;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    name: string;
    content: string;
  } | null;
  contactList: {
    id: string;
    name: string;
    _count: {
      contacts: number;
    };
  } | null;
  recipients?: {
    id: string;
    contact: {
      email: string;
    };
    status: string;
    sentAt?: string;
    events?: {
      type: string;
      createdAt: string;
    }[];
  }[];
  content?: string;
};

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isLoadingProcess, setIsLoadingProcess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResending, setIsResending] = useState<Record<string, boolean>>({});
  const [isResendingAll, setIsResendingAll] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { showNotification } = useNotification();
  const [showStatusNotification, setShowStatusNotification] = useState(false);
  const [statusNotification, setStatusNotification] = useState({
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    title: '',
    message: '',
    type: 'warning' as 'success' | 'error' | 'warning' | 'info',
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
      return;
    }

    fetchCampaign();
  }, [isAuthenticated, isLoading]);

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCampaign(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch campaign');
      }
    } catch (error) {
      setError('An error occurred while fetching the campaign');
    } finally {
      setIsLoadingCampaign(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/campaigns');
      } else {
        const error = await response.json();
        console.error('Failed to delete campaign:', error);
        
        // Use custom notification instead of alert
        setStatusNotification({
          title: 'Delete Failed',
          message: 'Failed to delete campaign. Please try again.',
          type: 'error'
        });
        setShowStatusNotification(true);
        
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      
      // Use custom notification instead of alert
      setStatusNotification({
        title: 'Delete Failed',
        message: 'An error occurred while deleting the campaign. Please try again.',
        type: 'error'
      });
      setShowStatusNotification(true);
      
      setIsDeleting(false);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleLaunch = async () => {
    if (!campaign) return;
    
    // If campaign is already scheduled, prompt to send now
    if (campaign.status === 'SCHEDULED') {
      setConfirmDialogProps({
        title: 'Send Campaign Now',
        message: 'Are you sure you want to send this campaign immediately?',
        type: 'warning',
        confirmText: 'Send Now',
        cancelText: 'Cancel'
      });
      
      setConfirmAction(() => async () => {
        setIsLaunching(true);
        
        try {
          const response = await fetch(`/api/campaigns/${params.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'SENDING',
              scheduledAt: null,
            }),
          });
          
          if (response.ok) {
            fetchCampaign();
            
            setStatusNotification({
              title: 'Campaign Ready to Send',
              message: 'Campaign is now ready to be processed and sent.',
              type: 'success'
            });
            setShowStatusNotification(true);
          } else {
            const error = await response.json();
            console.error('Failed to update campaign status:', error);
            
            setStatusNotification({
              title: 'Action Failed',
              message: error.error || 'Failed to send campaign.',
              type: 'error'
            });
            setShowStatusNotification(true);
          }
        } catch (error) {
          console.error('Error updating campaign status:', error);
          
          setStatusNotification({
            title: 'Action Failed',
            message: 'An error occurred while sending the campaign.',
            type: 'error'
          });
          setShowStatusNotification(true);
        } finally {
          setIsLaunching(false);
        }
      });
      
      setShowConfirmDialog(true);
      return;
    }
    
    // For draft campaigns, show the date picker dialog
    setShowDatePicker(true);
    
    // Set default scheduled date to 5 minutes from now
    const defaultDate = new Date(Date.now() + 1000 * 60 * 5);
    // Format date for datetime-local input (YYYY-MM-DDThh:mm)
    const formattedDate = defaultDate.toISOString().slice(0, 16);
    setScheduledDate(formattedDate);
  };

  const handleProcessCampaign = async () => {
    // Allow processing both SENDING and SCHEDULED campaigns
    if (campaign?.status !== 'SENDING' && campaign?.status !== 'SCHEDULED') {
      setError('Only campaigns in SENDING or SCHEDULED status can be processed');
      setStatusNotification({
        title: 'Invalid Campaign Status',
        message: 'Only campaigns in SENDING or SCHEDULED status can be processed',
        type: 'error'
      });
      setShowStatusNotification(true);
      return;
    }

    // If campaign is in SCHEDULED status, ask for confirmation to send now
    if (campaign?.status === 'SCHEDULED') {
      setConfirmDialogProps({
        title: 'Process Campaign Now',
        message: 'This will cancel the scheduled sending and process the campaign immediately. Continue?',
        type: 'warning',
        confirmText: 'Send Now',
        cancelText: 'Cancel'
      });
      
      setConfirmAction(() => async () => {
        // First, update the campaign status to SENDING
        try {
          const statusResponse = await fetch(`/api/campaigns/${params.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'SENDING',
              scheduledAt: null,
            }),
          });
          
          if (!statusResponse.ok) {
            const error = await statusResponse.json();
            throw new Error(error.error || 'Failed to update campaign status');
          }
          
          // Now process the campaign
          processTheCampaign();
        } catch (error) {
          console.error('Error updating campaign status:', error);
          setStatusNotification({
            title: 'Process Failed',
            message: error instanceof Error ? error.message : 'An error occurred',
            type: 'error'
          });
          setShowStatusNotification(true);
        }
      });
      
      setShowConfirmDialog(true);
      return;
    }

    // For campaigns already in SENDING status, process directly
    processTheCampaign();
  };

  const processTheCampaign = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/campaigns/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: params.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Check if the API request actually failed but was still reported as success
          if (result.error && result.error.includes('Gmail API has not been used')) {
            // Show error notification for Gmail API not enabled
            setStatusNotification({
              title: 'Gmail API Not Configured',
              message: 'The Gmail API has not been enabled for this project. Please enable it in the Google Cloud Console.',
              type: 'error'
            });
            setShowStatusNotification(true);
            console.error('Gmail API error:', result.error);
            setError('Gmail API not configured properly');
          } else {
            let notificationType = 'success';
            let notificationTitle = 'Campaign Processed';
            let notificationMessage = result.message || 'Campaign processed successfully!';
            
            // Check if there were any failed emails
            if (result.failed > 0) {
              notificationType = result.sent > 0 ? 'warning' : 'error';
              notificationTitle = result.sent > 0 ? 'Campaign Partially Sent' : 'Campaign Failed';
              notificationMessage = `${result.sent} emails sent, ${result.failed} failed. ${result.error || ''}`;
              
              // If all emails failed, show more prominent error
              if (result.sent === 0) {
                setStatusNotification({
                  title: 'Campaign Failed',
                  message: result.error || 'No emails could be sent. Please check your configuration.',
                  type: 'error'
                });
                setShowStatusNotification(true);
              } else {
                // Show partial success notification
                setStatusNotification({
                  title: notificationTitle,
                  message: notificationMessage,
                  type: notificationType as 'success' | 'error' | 'warning' | 'info'
                });
                setShowStatusNotification(true);
              }
            } else {
              // Show success notification
              setStatusNotification({
                title: 'Campaign Processed',
                message: `${result.sent} emails sent successfully!`,
                type: 'success'
              });
              setShowStatusNotification(true);
            }
          }
          
          fetchCampaign(); // Refresh campaign data
        } else {
          const errorMessage = result.message || 'Failed to process campaign';
          setError(errorMessage);
          setStatusNotification({
            title: 'Campaign Failed',
            message: errorMessage,
            type: 'error'
          });
          setShowStatusNotification(true);
        }
      } else {
        let errorMessage = 'Failed to process campaign';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error JSON, use a generic message
          console.error('Error parsing response:', e);
        }
        
        setError(errorMessage);
        setStatusNotification({
          title: 'Campaign Failed',
          message: errorMessage,
          type: 'error'
        });
        setShowStatusNotification(true);
      }
    } catch (error) {
      console.error('Error processing campaign:', error);
      const errorMessage = 'An error occurred while processing the campaign';
      setError(errorMessage);
      setStatusNotification({
        title: 'Campaign Failed',
        message: errorMessage,
        type: 'error'
      });
      setShowStatusNotification(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendEmail = async (recipientId: string) => {
    setIsResending(prev => ({ ...prev, [recipientId]: true }));
    setError(null);

    try {
      const response = await fetch('/api/campaigns/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: params.id,
          recipientId: recipientId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Use only the status notification
          setStatusNotification({
            title: 'Email Resent',
            message: `Successfully resent email to ${result.recipient?.email || 'recipient'}`,
            type: 'success'
          });
          setShowStatusNotification(true);
          
          fetchCampaign(); // Refresh campaign data
        } else {
          const errorMessage = result.message || 'Failed to resend email';
          setError(errorMessage);
          
          setStatusNotification({
            title: 'Resend Failed',
            message: errorMessage,
            type: 'error'
          });
          setShowStatusNotification(true);
        }
      } else {
        let errorMessage = 'Failed to resend email';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Error parsing response:', e);
        }
        
        setError(errorMessage);
        
        setStatusNotification({
          title: 'Resend Failed',
          message: errorMessage,
          type: 'error'
        });
        setShowStatusNotification(true);
      }
    } catch (error) {
      console.error('Error resending email:', error);
      const errorMessage = 'An error occurred while resending the email';
      setError(errorMessage);
      
      setStatusNotification({
        title: 'Resend Failed',
        message: errorMessage,
        type: 'error'
      });
      setShowStatusNotification(true);
    } finally {
      setIsResending(prev => ({ ...prev, [recipientId]: false }));
    }
  };

  const handleResendAllFailedEmails = async () => {
    // Configure the confirmation dialog
    setConfirmDialogProps({
      title: 'Resend All Failed Emails',
      message: 'Are you sure you want to resend all failed emails in this campaign?',
      type: 'warning',
      confirmText: 'Resend All',
      cancelText: 'Cancel'
    });
    
    // Set the action to perform if confirmed
    setConfirmAction(() => async () => {
      setIsResendingAll(true);
      setError(null);
      
      try {
        const response = await fetch('/api/campaigns/resend-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId: params.id,
          }),
        });
  
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStatusNotification({
              title: 'Emails Resent',
              message: `Successfully resent ${result.results.resent} out of ${result.results.resent + result.results.failed} failed emails.`,
              type: 'success'
            });
            setShowStatusNotification(true);
            
            fetchCampaign(); // Refresh campaign data
          } else {
            const errorMessage = result.message || 'Failed to resend emails';
            setError(errorMessage);
            
            setStatusNotification({
              title: 'Resend Failed',
              message: errorMessage,
              type: 'error'
            });
            setShowStatusNotification(true);
          }
        } else {
          let errorMessage = 'Failed to resend emails';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Error parsing response:', e);
          }
          
          setError(errorMessage);
          
          setStatusNotification({
            title: 'Resend Failed',
            message: errorMessage,
            type: 'error'
          });
          setShowStatusNotification(true);
        }
      } catch (error) {
        console.error('Error resending all failed emails:', error);
        const errorMessage = 'An error occurred while resending the emails';
        setError(errorMessage);
        
        setStatusNotification({
          title: 'Resend Failed',
          message: errorMessage,
          type: 'error'
        });
        setShowStatusNotification(true);
      } finally {
        setIsResendingAll(false);
      }
    });
    
    // Show the confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleSchedule = () => {
    setShowDatePicker(true);
  };

  const confirmSchedule = async () => {
    setIsLaunching(true);
    
    try {
      // Convert the scheduled date from the input format to ISO string
      const scheduledDateTime = new Date(scheduledDate).toISOString();
      
      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'SCHEDULED',
          scheduledAt: scheduledDateTime,
        }),
      });
      
      if (response.ok) {
        // Close the date picker and refresh campaign data
        setShowDatePicker(false);
        fetchCampaign();
        
        setStatusNotification({
          title: 'Campaign Scheduled',
          message: `Campaign scheduled for ${new Date(scheduledDate).toLocaleString()}`,
          type: 'success'
        });
        setShowStatusNotification(true);
      } else {
        const error = await response.json();
        console.error('Failed to schedule campaign:', error);
        
        setStatusNotification({
          title: 'Schedule Failed',
          message: error.error || 'Failed to schedule campaign',
          type: 'error'
        });
        setShowStatusNotification(true);
      }
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      
      setStatusNotification({
        title: 'Schedule Failed',
        message: 'An error occurred while scheduling the campaign',
        type: 'error'
      });
      setShowStatusNotification(true);
    } finally {
      setIsLaunching(false);
    }
  };

  if (isLoading) {
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
          href="/campaigns"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Campaigns
        </Link>
      </div>
      
      {isLoadingCampaign ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-500"></div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : campaign ? (
        <div className="space-y-6">
          {/* Campaign Header */}
          <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
              {campaign.description && (
                <p className="mt-1 text-gray-500 dark:text-gray-400">{campaign.description}</p>
              )}
            </div>
            <div className="flex space-x-3">
              {/* Make Edit button available for all campaign statuses */}
              <Link
                href={`/campaigns/${params.id}/edit`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-dark-accent dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-accent/70"
              >
                Edit
              </Link>
              
              {campaign.status === 'DRAFT' && (
                <button
                  onClick={handleLaunch}
                  disabled={isLaunching}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
                >
                  {isLaunching ? 'Launching...' : 'Launch Campaign'}
                </button>
              )}
              {(campaign.status === 'SCHEDULED' || campaign.status === 'SENDING') && (
                <button
                  onClick={handleProcessCampaign}
                  disabled={isProcessing}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {isProcessing ? 'Processing...' : 'Process Campaign'}
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-800/30 dark:bg-dark-card dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          {/* Campaign Details */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-dark-accent dark:bg-dark-card">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Campaign Details</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Subject</p>
                      <p className="mt-1 text-gray-900 dark:text-white">{campaign.subject}</p>
                    </div>
                    {campaign.scheduledAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Scheduled For</p>
                        <p className="mt-1 text-gray-900 dark:text-white">
                          {new Date(campaign.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {new Date(campaign.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</p>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {new Date(campaign.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Related Resources</h3>
                  <div className="mt-4 space-y-4">
                    {campaign.template && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Template</p>
                        <Link
                          href={`/templates/${campaign.template.id}`}
                          className="mt-1 block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {campaign.template.name}
                        </Link>
                      </div>
                    )}
                    {campaign.contactList && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact List</p>
                        <Link
                          href={`/contacts/lists/${campaign.contactList.id}`}
                          className="mt-1 block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {campaign.contactList.name} ({campaign.contactList._count.contacts} contacts)
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Preview */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-dark-accent dark:bg-dark-card">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email Preview</h3>
              <div className="mt-4">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-dark-accent">
                  <div className="mb-4 border-b border-gray-200 pb-2 dark:border-dark-accent">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Subject: <span className="text-gray-900 dark:text-white">{campaign.subject}</span></p>
                  </div>
                  
                  {/* Content debugging info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mb-4 border-b border-gray-200 pb-2 text-xs dark:border-dark-accent">
                      <p className="text-gray-500 dark:text-gray-400">Campaign content exists: <span className="font-mono">{campaign.content ? 'true' : 'false'}</span></p>
                      <p className="text-gray-500 dark:text-gray-400">Template exists: <span className="font-mono">{campaign.template ? 'true' : 'false'}</span></p>
                      {campaign.template && (
                        <p className="text-gray-500 dark:text-gray-400">Template content exists: <span className="font-mono">{campaign.template.content ? 'true' : 'false'}</span></p>
                      )}
                    </div>
                  )}
                  
                  <div 
                    className="prose max-w-none dark:prose-invert" 
                    dangerouslySetInnerHTML={{ 
                      __html: campaign.content || (campaign.template?.content || 'No content available')
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recipients and Delivery Status */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-dark-accent dark:bg-dark-card">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recipients</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Delivered</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sent</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Opened</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Failed</span>
                  </div>
                </div>
              </div>
              
              {/* Check if there are any failed emails and add the "Resend All Failed" button */}
              {campaign?.recipients?.some(recipient => recipient.status.toUpperCase() === 'FAILED' || recipient.status.toLowerCase() === 'failed') && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleResendAllFailedEmails}
                    disabled={isResendingAll}
                    className="inline-flex items-center rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-50"
                  >
                    {isResendingAll ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resending...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Resend All Failed
                      </>
                    )}
                  </button>
                </div>
              )}
              
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Sent At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Opened At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Clicks
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
                    {campaign.recipients?.map((recipient) => {
                      const openEvent = recipient.events?.find(e => e.type === 'OPEN');
                      const clickEvents = recipient.events?.filter(e => e.type === 'CLICK') || [];
                      
                      return (
                        <tr key={recipient.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {recipient.contact.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <DeliveryStatusBadge status={recipient.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {recipient.sentAt ? new Date(recipient.sentAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {openEvent ? new Date(openEvent.createdAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {clickEvents.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {recipient.status === 'FAILED' && (
                              <button
                                onClick={() => handleResendEmail(recipient.id)}
                                disabled={isResending[recipient.id]}
                                className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-50"
                              >
                                {isResending[recipient.id] ? (
                                  <>
                                    <svg className="mr-1.5 h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Resending...
                                  </>
                                ) : (
                                  <>
                                    <svg className="mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Resend
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add the DeleteConfirmationModal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Campaign"
        message="Are you sure you want to delete this campaign? This action cannot be undone."
      />

      {/* Status notification */}
      <StatusNotification
        isOpen={showStatusNotification}
        onClose={() => setShowStatusNotification(false)}
        title={statusNotification.title}
        message={statusNotification.message}
        type={statusNotification.type}
      />
      
      {/* Confirmation dialog */}
      <StatusNotification
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmAction}
        showConfirmButton={true}
        title={confirmDialogProps.title}
        message={confirmDialogProps.message}
        type={confirmDialogProps.type}
        confirmText={confirmDialogProps.confirmText}
        cancelText={confirmDialogProps.cancelText}
      />

      {/* Date Picker Dialog */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Schedule Campaign</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Select when you would like this campaign to be sent:
            </p>
            
            <div className="mb-4">
              <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Scheduled Date and Time
              </label>
              <input
                type="datetime-local"
                id="scheduledDate"
                name="scheduledDate"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-accent dark:border-dark-border dark:text-white"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-accent dark:border-dark-border dark:text-gray-300 dark:hover:bg-dark-accent/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSchedule}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  let bgColor = '';
  let textColor = '';
  let label = '';

  switch (status) {
    case 'DRAFT':
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-300';
      label = 'Draft';
      break;
    case 'SCHEDULED':
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
      textColor = 'text-yellow-800 dark:text-yellow-400';
      label = 'Scheduled';
      break;
    case 'SENDING':
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      textColor = 'text-blue-800 dark:text-blue-400';
      label = 'Sending';
      break;
    case 'SENT':
      bgColor = 'bg-green-100 dark:bg-green-900/30';
      textColor = 'text-green-800 dark:text-green-400';
      label = 'Sent';
      break;
    case 'FAILED':
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-800 dark:text-red-400';
      label = 'Failed';
      break;
    default:
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-300';
      label = status;
  }

  return (
    <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  let bgColor = '';
  let textColor = '';
  let label = status;

  switch (status) {
    case 'PENDING':
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-300';
      break;
    case 'SENT':
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
      textColor = 'text-yellow-800 dark:text-yellow-400';
      break;
    case 'DELIVERED':
      bgColor = 'bg-green-100 dark:bg-green-900/30';
      textColor = 'text-green-800 dark:text-green-400';
      break;
    case 'FAILED':
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-800 dark:text-red-400';
      break;
    default:
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-300';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}

function Button({ onClick, disabled, children, className }: { onClick: () => void; disabled: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
} 