import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/firebase/auth-server';

// GET - Fetch analytics data
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Check if user is authenticated
    if (!user || !user.email) {
      console.log('Unauthorized: No authenticated user found');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get query parameters for filtering
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'all';
    const campaignId = url.searchParams.get('campaignId');

    // Find or create user in database
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      console.log(`Creating new user for ${user.email}`);
      dbUser = await prisma.user.create({
        data: {
          email: user.email,
          name: user.name || user.email.split('@')[0],
        },
      });
    }

    // Prepare date filter based on period
    const dateFilter: any = {};
    const now = new Date();
    
    if (period === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      dateFilter.gte = startOfDay;
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter.gte = startOfWeek;
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.gte = startOfMonth;
    } else if (period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      dateFilter.gte = startOfYear;
    }

    // Prepare campaign filter
    const campaignFilter: any = {};
    if (campaignId) {
      campaignFilter.id = campaignId;
    }

    // Get campaigns with real events
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: dbUser.id,
        ...campaignFilter,
        sentAt: dateFilter,
      },
      include: {
        recipients: {
          include: {
            events: true,
            contact: true,
          },
        },
      },
    });

    // Get additional data for summary (using real counts, not fixed numbers)
    const [contactsCount, listsCount, templatesCount, allCampaigns] = await Promise.all([
      prisma.contact.count({ where: { contactList: { userId: dbUser.id } } }),
      prisma.contactList.count({ where: { userId: dbUser.id } }),
      prisma.template.count({ where: { userId: dbUser.id } }),
      prisma.campaign.findMany({ where: { userId: dbUser.id } }),
    ]);

    // Calculate campaign status counts
    const draftCampaigns = allCampaigns.filter(c => c.status === 'draft').length;
    const scheduledCampaigns = allCampaigns.filter(c => c.status === 'scheduled').length;
    const sendingCampaigns = allCampaigns.filter(c => c.status === 'sending').length;
    const sentCampaigns = allCampaigns.filter(c => c.status === 'sent').length;

    // Process real analytics data from events
    const analytics = {
      totalCampaigns: campaigns.length,
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      openRate: 0,
      clickRate: 0,
      campaigns: allCampaigns.map(campaign => {
        const fullCampaign = campaigns.find(c => c.id === campaign.id);
        const recipients = fullCampaign?.recipients || [];
        
        // Filter events for the date period if date filter is applied
        const filteredRecipients = recipients.map(recipient => {
          if (Object.keys(dateFilter).length === 0) {
            return recipient; // No date filter, use all events
          }
          
          // Filter events for this recipient based on date
          const filteredEvents = recipient.events.filter(event => {
            if (dateFilter.gte && event.createdAt < dateFilter.gte) {
              return false;
            }
            if (dateFilter.lte && event.createdAt > dateFilter.lte) {
              return false;
            }
            return true;
          });
          
          // Return recipient with filtered events
          return { ...recipient, events: filteredEvents };
        });
        
        const sent = recipients.length;
        const opened = filteredRecipients.filter(recipient => 
          recipient.events.some(event => event.type === 'OPEN')
        ).length;
        const clicked = filteredRecipients.filter(recipient => 
          recipient.events.some(event => event.type === 'CLICK')
        ).length;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          subject: campaign.subject,
          sentAt: campaign.sentAt,
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString(),
          sent,
          opened,
          clicked,
          openRate: sent > 0 ? (opened / sent) * 100 : 0,
          clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
        };
      }),
      // Add real summary data
      summary: {
        totalContacts: contactsCount,
        totalLists: listsCount,
        totalTemplates: templatesCount,
        totalCampaigns: allCampaigns.length,
        sentCampaigns,
        draftCampaigns,
        scheduledCampaigns,
        sendingCampaigns,
      }
    };

    // Calculate totals
    analytics.totalSent = analytics.campaigns.reduce((sum, campaign) => sum + campaign.sent, 0);
    analytics.totalOpened = analytics.campaigns.reduce((sum, campaign) => sum + campaign.opened, 0);
    analytics.totalClicked = analytics.campaigns.reduce((sum, campaign) => sum + campaign.clicked, 0);
    analytics.openRate = analytics.totalSent > 0 ? (analytics.totalOpened / analytics.totalSent) * 100 : 0;
    analytics.clickRate = analytics.totalSent > 0 ? (analytics.totalClicked / analytics.totalSent) * 100 : 0;

    return new NextResponse(JSON.stringify(analytics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch analytics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 