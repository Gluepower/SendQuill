'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import PageLayout from '@/app/components/PageLayout';

type AnalyticsSummary = {
  totalContacts: number;
  totalLists: number;
  totalTemplates: number;
  totalCampaigns: number;
  sentCampaigns: number;
  draftCampaigns: number;
  scheduledCampaigns: number;
  sendingCampaigns: number;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
};

type AnalyticsData = {
  summary: AnalyticsSummary;
  campaigns: Campaign[];
};

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [period, setPeriod] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Fetch analytics data when the component mounts or period changes
    async function fetchAnalyticsData() {
      try {
        setIsLoadingData(true);
        const response = await fetch(`/api/analytics?period=${period}`);
        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        } else {
          setError('Failed to fetch analytics data');
        }
      } catch (error) {
        setError('An error occurred while fetching analytics data');
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    if (isAuthenticated) {
      fetchAnalyticsData();
    }
  }, [isAuthenticated, period]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark:bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Analytics</h2>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading analytics</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Time Period Selector */}
        <div className="flex space-x-2">
          <TimeButton label="All" value="all" currentValue={period} onClick={setPeriod} />
          <TimeButton label="Today" value="today" currentValue={period} onClick={setPeriod} />
          <TimeButton label="Week" value="week" currentValue={period} onClick={setPeriod} />
          <TimeButton label="Month" value="month" currentValue={period} onClick={setPeriod} />
          <TimeButton label="Year" value="year" currentValue={period} onClick={setPeriod} />
        </div>
        
        {isLoadingData ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
          </div>
        ) : analyticsData ? (
          <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Total Contacts"
                value={analyticsData.summary.totalContacts.toString()}
              />
              <KpiCard
                title="Contact Lists"
                value={analyticsData.summary.totalLists.toString()}
              />
              <KpiCard
                title="Email Templates"
                value={analyticsData.summary.totalTemplates.toString()}
              />
              <KpiCard
                title="Total Campaigns"
                value={analyticsData.summary.totalCampaigns.toString()}
              />
            </div>

            {/* Campaign Status Breakdown */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Campaign Status</h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatusCard
                  label="Draft"
                  count={analyticsData.summary.draftCampaigns}
                  bgColor="bg-gray-100 dark:bg-gray-700"
                  textColor="text-gray-800 dark:text-gray-200"
                />
                <StatusCard
                  label="Scheduled"
                  count={analyticsData.summary.scheduledCampaigns}
                  bgColor="bg-yellow-100 dark:bg-yellow-900/30"
                  textColor="text-yellow-800 dark:text-yellow-300"
                />
                <StatusCard
                  label="Sending"
                  count={analyticsData.summary.sendingCampaigns}
                  bgColor="bg-blue-100 dark:bg-blue-900/30"
                  textColor="text-blue-800 dark:text-blue-300"
                />
                <StatusCard
                  label="Sent"
                  count={analyticsData.summary.sentCampaigns}
                  bgColor="bg-green-100 dark:bg-green-900/30"
                  textColor="text-green-800 dark:text-green-300"
                />
              </div>
            </div>

            {/* Recent Campaigns Table */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Recent Campaigns</h3>
              {analyticsData.campaigns.length > 0 ? (
                <div className="overflow-hidden rounded-lg border bg-white shadow dark:bg-dark-card dark:border-dark-accent">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-dark-accent">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Campaign
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Created
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Last Updated
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">View</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-dark-card">
                      {analyticsData.campaigns.map((campaign) => (
                        <tr key={campaign.id}>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex flex-col">
                              <div className="font-medium text-gray-900 dark:text-gray-100">{campaign.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{campaign.subject}</div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <CampaignStatusBadge status={campaign.status} />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(campaign.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(campaign.updatedAt)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <Link
                              href={`/campaigns/${campaign.id}`}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border bg-white p-8 text-center dark:bg-dark-card dark:border-dark-accent">
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">No campaigns found</h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-400">Create your first email campaign to see analytics.</p>
                  <Link
                    href="/campaigns/new"
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Create Campaign
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-8 text-center dark:bg-dark-card dark:border-dark-accent">
            <p className="text-gray-500 dark:text-gray-400">No analytics data available yet.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function TimeButton({ 
  label, 
  value, 
  currentValue, 
  onClick 
}: { 
  label: string; 
  value: string; 
  currentValue: string; 
  onClick: (value: string) => void;
}) {
  return (
    <button
      className={`rounded-md px-3 py-1 text-sm font-medium ${
        currentValue === value
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-accent dark:text-gray-300 dark:hover:bg-dark-accent/70'
      }`}
      onClick={() => onClick(value)}
    >
      {label}
    </button>
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

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-dark-card dark:border-dark-accent">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function StatusCard({
  label,
  count,
  bgColor,
  textColor,
}: {
  label: string;
  count: number;
  bgColor: string;
  textColor: string;
}) {
  return (
    <div className="flex items-center rounded-lg border bg-white p-4 shadow-sm dark:bg-dark-card dark:border-dark-accent">
      <div className={`mr-4 flex h-12 w-12 items-center justify-center rounded-full ${bgColor}`}>
        <span className={`text-lg font-semibold ${textColor}`}>{count}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label} {label === 'Sent' ? 'Campaigns' : ''}
        </p>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {((count / Math.max(1, count)) * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  let bgColor = 'bg-gray-100 dark:bg-gray-700';
  let textColor = 'text-gray-800 dark:text-gray-200';

  switch (status) {
    case 'DRAFT':
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-200';
      break;
    case 'SCHEDULED':
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
      textColor = 'text-yellow-800 dark:text-yellow-300';
      break;
    case 'SENDING':
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      textColor = 'text-blue-800 dark:text-blue-300';
      break;
    case 'SENT':
      bgColor = 'bg-green-100 dark:bg-green-900/30';
      textColor = 'text-green-800 dark:text-green-300';
      break;
    case 'FAILED':
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-800 dark:text-red-300';
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

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
} 