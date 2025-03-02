'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import PageLayout from '@/app/components/PageLayout';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Analytics data type
type AnalyticsData = {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  campaigns: any[];
  summary: {
    totalContacts: number;
    totalLists: number;
    totalTemplates: number;
    totalCampaigns: number;
    sentCampaigns: number;
    draftCampaigns: number;
    scheduledCampaigns: number;
    sendingCampaigns: number;
  };
};

export default function Dashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Fetch real analytics data
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics?period=all');
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        } else {
          console.error('Failed to fetch analytics');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  if (isLoading || isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center dark:bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-brand-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Prepare chart data for campaign performance with updated colors
  const chartData = {
    labels: analytics?.campaigns.slice(0, 5).map(c => c.name) || [],
    datasets: [
      {
        label: 'Open Rate',
        data: analytics?.campaigns.slice(0, 5).map(c => c.openRate) || [],
        borderColor: '#3B82F6', // brand-primary
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Click Rate',
        data: analytics?.campaigns.slice(0, 5).map(c => c.clickRate) || [],
        borderColor: '#6366F1', // brand-secondary
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.4,
      },
    ],
  };

  // Doughnut chart for campaign status distribution with updated colors
  const campaignStatusData = {
    labels: ['Draft', 'Scheduled', 'Sending', 'Sent'],
    datasets: [
      {
        data: [
          analytics?.summary.draftCampaigns || 0,
          analytics?.summary.scheduledCampaigns || 0,
          analytics?.summary.sendingCampaigns || 0,
          analytics?.summary.sentCampaigns || 0,
        ],
        backgroundColor: [
          '#F59E0B', // Gold for draft
          '#3B82F6', // Blue for scheduled
          '#8B5CF6', // Purple for sending
          '#10B981', // Green for sent
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <PageLayout>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Welcome Section - Updated with more subtle, professional colors */}
        <div className="col-span-full bg-slate-100 dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 relative">
          <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome back, {user?.displayName || 'Marketer'}!</h1>
          <p className="mb-4 font-medium text-slate-600 dark:text-slate-300">Here's a quick overview of your email marketing performance.</p>
          <div className="flex items-center gap-4">
            <Link href="/campaigns/new">
              <button className="btn bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm transition-colors">
                Create New Campaign
              </button>
            </Link>
            {/* Theme indicator for testing */}
            <div className="text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 py-1 shadow-sm text-slate-700 dark:text-slate-300">
              Current theme: <span className="font-bold">{document.documentElement.classList.contains('dark') ? 'Dark' : 'Light'}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats - With Real Data */}
        <div className="col-span-full">
          <h2 className="mb-4 text-xl font-semibold">Quick Stats</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard 
              title="Campaigns" 
              value={analytics?.summary.totalCampaigns.toString() || '0'} 
              icon="📊"
            />
            <KpiCard 
              title="Templates" 
              value={analytics?.summary.totalTemplates.toString() || '0'} 
              icon="📝"
            />
            <KpiCard 
              title="Contacts" 
              value={analytics?.summary.totalContacts.toString() || '0'} 
              icon="👥"
            />
            <KpiCard 
              title="Open Rate" 
              value={`${Math.round(analytics?.openRate || 0)}%`} 
              icon="📨"
            />
          </div>
        </div>

        {/* Performance Chart */}
        <div className="col-span-2 chart-container">
          <h3 className="mb-4 text-lg font-medium">Recent Campaign Performance</h3>
          {analytics?.campaigns && analytics.campaigns.length > 0 ? (
            <div className="h-72">
              <Line 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        color: document.documentElement.classList.contains('dark') ? 'var(--color-text-primary)' : 'var(--color-text-primary)',
                      }
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(67, 76, 94, 0.5)' : 'rgba(229, 231, 235, 0.8)',
                      },
                      ticks: {
                        color: document.documentElement.classList.contains('dark') ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)',
                        callback: function(tickValue: any) {
                          return tickValue + '%';
                        }
                      }
                    },
                    x: {
                      grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(67, 76, 94, 0.5)' : 'rgba(229, 231, 235, 0.8)',
                      },
                      ticks: {
                        color: document.documentElement.classList.contains('dark') ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)',
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-light-muted dark:text-dark-muted">No campaign data available yet</p>
            </div>
          )}
        </div>

        {/* Campaign Status Distribution */}
        <div className="chart-container">
          <h3 className="mb-4 text-lg font-medium">Campaign Status</h3>
          {analytics?.campaigns && analytics.campaigns.length > 0 ? (
            <div className="h-72">
              <Doughnut 
                data={campaignStatusData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        color: document.documentElement.classList.contains('dark') ? 'var(--color-text-primary)' : 'var(--color-text-primary)',
                        padding: 20,
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-light-muted dark:text-dark-muted">No campaign data available yet</p>
            </div>
          )}
        </div>

        {/* Action Cards - Update to use our consistent theme classes */}
        <ActionCard
          title="Create Campaign"
          description="Set up a new email campaign to reach your audience"
          href="/campaigns/new"
          icon="✉️"
          color="bg-brand-primary dark:bg-brand-primaryDark"
        />
        <ActionCard
          title="Add Contacts"
          description="Import or add new contacts to your lists"
          href="/contacts"
          icon="👤"
          color="bg-brand-success dark:bg-brand-successDark"
        />
        <ActionCard
          title="View Analytics"
          description="See how your campaigns are performing"
          href="/analytics"
          icon="📈"
          color="bg-brand-secondary dark:bg-brand-secondaryDark"
        />
        <ActionCard
          title="Manage Templates"
          description="Create or edit email templates"
          href="/templates"
          icon="📄"
          color="bg-brand-warning dark:bg-brand-warningDark"
        />
      </div>
    </PageLayout>
  );
}

function KpiCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-light-muted dark:text-dark-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, href, icon, color }: { 
  title: string; 
  description: string; 
  href: string;
  icon: string;
  color: string;
}) {
  return (
    <Link href={href} className="block">
      <div className={`action-card group h-full overflow-hidden rounded-lg ${color} p-6 text-white shadow-md transition-all duration-300 hover:shadow-xl`}>
        <div className="flex items-center space-x-2">
          <span className="text-xl">{icon}</span>
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-white opacity-90">{description}</p>
        <div className="mt-4 flex justify-end">
          <span className="transform text-sm opacity-70 transition-transform group-hover:translate-x-2">
            Get Started →
          </span>
        </div>
      </div>
    </Link>
  );
} 