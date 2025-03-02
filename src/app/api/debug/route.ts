import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/firebase/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get campaign ID from URL
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Get campaign with recipients
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          include: {
            contact: true
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Count recipients by status
    const statusCounts = {
      SENT: 0,
      DELIVERED: 0,
      FAILED: 0,
      PENDING: 0,
      SCHEDULED: 0
    };

    campaign.recipients.forEach(recipient => {
      const status = recipient.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });

    // Get list of failed recipients
    const failedRecipients = campaign.recipients
      .filter(r => r.status === 'FAILED')
      .map(r => ({
        id: r.id,
        email: r.contact.email
      }));

    return NextResponse.json({
      campaignId: campaign.id,
      campaignName: campaign.name,
      recipientCount: campaign.recipients.length,
      statusCounts,
      failedRecipients,
      hasFailed: failedRecipients.length > 0
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 