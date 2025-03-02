'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';

type CampaignDetail = {
  id: string;
  name: string;
  status: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  contactListId: string;
  contactListName: string;
  totalContacts: number;
  sent: number;
  opened: number;
  clicked: number;
};

export default function CampaignAnalyticsPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Fetch campaign analytics data when the component mounts
    async function fetchCampaignData() {
      if (!params.id) return;

      try {
        setIsLoadingData(true);
        // Fetch campaign data with analytics
        const response = await fetch(`/api/analytics?campaignId=${params.id}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.campaigns && data.campaigns.length > 0) {
            setCampaign(data.campaigns[0]);
          } else {
            setError('Campaign not found');
          }
        } else {
          setError('Failed to fetch campaign analytics');
        }
      } catch (error) {
        setError('An error occurred while fetching campaign data');
        console.error('Error fetching campaign:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    if (isAuthenticated) {
      fetchCampaignData();
    }
  }, [isAuthenticated, params.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  // Calculate metrics if campaign data is available
  const openRate = campaign ? (campaign.opened / Math.max(1, campaign.sent) * 100).toFixed(2) : '0';
  const clickRate = campaign ? (campaign.clicked / Math.max(1, campaign.sent) * 100).toFixed(2) : '0';
  const clickThroughRate = campaign ? (campaign.clicked / Math.max(1, campaign.opened) * 100).toFixed(2) : '0';

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">SendQuill</h1>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-gray-50 p-4">
          <nav className="space-y-1">
            <NavItem href="/dashboard" label="Dashboard" />
            <NavItem href="/contacts" label="Contacts" />
            <NavItem href="/templates" label="Templates" />
            <NavItem href="/campaigns" label="Campaigns" isActive />
            <NavItem href="/analytics" label="Analytics" />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {isLoadingData ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          ) : campaign ? (
            <>
              {/* Campaign Header with Navigation */}
              <div className="mb-6">
                <div className="flex items-center">
                  <Link
                    href="/campaigns"
                    className="mr-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Campaigns
                  </Link>
                  <span className="text-sm text-gray-500">/</span>
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="mx-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {campaign.name}
                  </Link>
                  <span className="text-sm text-gray-500">/</span>
                  <span className="ml-2 text-sm font-medium text-gray-500">Analytics</span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h2 className="text-2xl font-semibold text-gray-900">{campaign.name}</h2>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <p className="mt-1 text-sm text-gray-600">{campaign.subject}</p>
              </div>

              {/* Campaign Navigation */}
              <div className="mb-6 border-b">
                <nav className="-mb-px flex space-x-8">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                  >
                    Overview
                  </Link>
                  <Link
                    href={`/campaigns/${campaign.id}/edit`}
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/campaigns/${campaign.id}/analytics`}
                    className="border-blue-500 text-blue-600 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                    aria-current="page"
                  >
                    Analytics
                  </Link>
                </nav>
              </div>

              {/* Campaign Info */}
              <div className="mb-8 grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Campaign Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Contact List:</span>
                      <span className="text-sm font-medium text-gray-900">{campaign.contactListName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Recipients:</span>
                      <span className="text-sm font-medium text-gray-900">{campaign.totalContacts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Created:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(campaign.createdAt)}</span>
                    </div>
                    {campaign.sentAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Sent:</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(campaign.sentAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Delivery Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Sent:</span>
                      <span className="text-sm font-medium text-gray-900">{campaign.sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Opened:</span>
                      <span className="text-sm font-medium text-gray-900">{campaign.opened}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Clicked:</span>
                      <span className="text-sm font-medium text-gray-900">{campaign.clicked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Delivery Rate:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {((campaign.sent / Math.max(1, campaign.totalContacts)) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mb-8">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Key Performance Metrics</h3>
                <div className="grid gap-6 sm:grid-cols-3">
                  <MetricCard
                    title="Open Rate"
                    value={`${openRate}%`}
                    description={`${campaign.opened} of ${campaign.sent} emails opened`}
                    color="text-green-600"
                  />
                  <MetricCard
                    title="Click Rate"
                    value={`${clickRate}%`}
                    description={`${campaign.clicked} of ${campaign.sent} emails clicked`}
                    color="text-blue-600"
                  />
                  <MetricCard
                    title="Click-Through Rate"
                    value={`${clickThroughRate}%`}
                    description={`${campaign.clicked} of ${campaign.opened} opened emails clicked`}
                    color="text-purple-600"
                  />
                </div>
              </div>

              {/* Engagement Over Time */}
              <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Engagement Over Time</h3>
                <div className="flex h-64 items-center justify-center border-t border-l">
                  <p className="text-gray-500">Detailed engagement charts will be implemented soon.</p>
                </div>
              </div>

              {/* Geographic Distribution */}
              <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Geographic Distribution</h3>
                <div className="flex h-64 items-center justify-center">
                  <p className="text-gray-500">Geographic distribution data will be available soon.</p>
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Device & Email Client Breakdown</h3>
                <div className="flex h-64 items-center justify-center">
                  <p className="text-gray-500">Device and email client data will be available soon.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-700">
              No campaign data available.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, label, isActive }: { href: string; label: string; isActive?: boolean }) {
  return (
    <a
      href={href}
      className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </a>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';

  switch (status) {
    case 'DRAFT':
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      break;
    case 'SCHEDULED':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      break;
    case 'SENDING':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      break;
    case 'SENT':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      break;
    case 'FAILED':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      break;
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${bgColor} ${textColor}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function MetricCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: string;
  description: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
} 