import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/firebase/auth-server';
import { prisma } from '@/lib/prisma';
import { resendFailedEmail } from '@/lib/email/campaign-sender';

/**
 * Resend all failed emails for a campaign
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the campaign ID from the request body
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Check if the campaign exists and belongs to the user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        user: true
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.user.email !== user.email) {
      return NextResponse.json(
        { error: 'You do not have permission to resend emails for this campaign' },
        { status: 403 }
      );
    }

    // Get failed recipients for this campaign
    const failedRecipients = await prisma.campaignRecipient.findMany({
      where: { 
        campaignId,
        status: 'FAILED'
      },
      include: {
        contact: true
      }
    });

    if (failedRecipients.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No failed emails found for this campaign',
          resent: 0,
          failed: 0
        },
        { status: 400 }
      );
    }

    // Get Gmail access token from cookies
    const accessToken = request.cookies.get('gmail-token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail authentication required. Please reconnect your Gmail account.' },
        { status: 401 }
      );
    }

    // Resend all failed emails
    const results = {
      resent: 0,
      failed: 0,
      emails: [] as { id: string, email: string, success: boolean, error?: string }[]
    };

    for (const recipient of failedRecipients) {
      try {
        const result = await resendFailedEmail({
          campaignId,
          recipientId: recipient.id,
          accessToken
        });
        
        results.resent++;
        results.emails.push({
          id: recipient.id,
          email: recipient.contact.email,
          success: true
        });
      } catch (error) {
        results.failed++;
        results.emails.push({
          id: recipient.id,
          email: recipient.contact.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully resent ${results.resent} out of ${failedRecipients.length} failed emails`,
      results
    });
  } catch (error) {
    console.error('Error resending all failed emails:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred while resending the emails'
      },
      { status: 500 }
    );
  }
} 