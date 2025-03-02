import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/firebase/auth-server';
import { prisma } from '@/lib/prisma';
import { resendFailedEmail } from '@/lib/email/campaign-sender';

/**
 * Resend a failed email for a specific recipient
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

    // Get the campaign ID and recipient ID from the request body
    const { campaignId, recipientId } = await request.json();

    if (!campaignId || !recipientId) {
      return NextResponse.json(
        { error: 'Campaign ID and Recipient ID are required' },
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

    // Check if the recipient exists and is in FAILED status
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
      include: {
        contact: true
      }
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    if (recipient.campaignId !== campaignId) {
      return NextResponse.json(
        { error: 'Recipient does not belong to this campaign' },
        { status: 400 }
      );
    }

    if (recipient.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Can only resend emails that previously failed' },
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

    // Resend the email
    const result = await resendFailedEmail({
      campaignId,
      recipientId,
      accessToken
    });

    return NextResponse.json({
      success: true,
      message: 'Email resent successfully',
      result
    });
  } catch (error) {
    console.error('Error resending email:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred while resending the email'
      },
      { status: 500 }
    );
  }
} 