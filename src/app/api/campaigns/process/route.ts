import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/firebase/auth-server';
import { prisma } from '@/lib/prisma';
import { sendCampaign } from '@/lib/email/campaign-sender';
import Cookies from 'js-cookie';

/**
 * Process a specific campaign by ID
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
        user: true,
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

    if (campaign.user.email !== user.email) {
      return NextResponse.json(
        { error: 'You do not have permission to process this campaign' },
        { status: 403 }
      );
    }

    // Get Gmail access token from cookies
    const accessToken = request.cookies.get('gmail-token')?.value;
    
    if (!accessToken) {
      console.error('Gmail token missing when attempting to process campaign');
      return NextResponse.json(
        { 
          error: 'Gmail authentication required. Please reconnect your Gmail account.',
          code: 'GMAIL_AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    // Validate token format
    if (typeof accessToken !== 'string' || accessToken.trim() === '') {
      console.error('Gmail token invalid when attempting to process campaign');
      return NextResponse.json(
        { 
          error: 'Gmail token is invalid. Please reconnect your Gmail account.',
          code: 'GMAIL_TOKEN_INVALID'
        },
        { status: 401 }
      );
    }

    // Process the campaign
    try {
      const result = await sendCampaign({ 
        campaignId: campaign.id,
        accessToken 
      });

      return NextResponse.json({
        success: true,
        message: `Campaign processed successfully. Sent: ${result.sent}, Failed: ${result.failed}`,
        ...result
      });
    } catch (error) {
      console.error('Error in campaign processing:', error);
      
      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('invalid_grant') || 
          errorMessage.includes('invalid_token') || 
          errorMessage.includes('unauthorized')) {
        return NextResponse.json(
          { 
            error: 'Gmail authentication expired. Please reconnect your Gmail account.',
            code: 'GMAIL_AUTH_EXPIRED'
          },
          { status: 401 }
        );
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error processing campaign:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred while processing the campaign'
      },
      { status: 500 }
    );
  }
}

/**
 * Process all campaigns with SENDING status (called by cron job)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is coming from an authorized source
    const apiKey = request.headers.get('x-api-key');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!apiKey || apiKey !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find all campaigns in SENDING status
    const campaigns = await prisma.campaign.findMany({
      where: { 
        status: 'SENDING',
        sentAt: null // Only process campaigns that haven't been sent
      },
      include: {
        user: true,
        recipients: {
          include: {
            contact: true
          }
        }
      }
    });

    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No campaigns to process',
        processed: 0
      });
    }

    // Process each campaign
    const results = [];
    for (const campaign of campaigns) {
      try {
        const result = await sendCampaign({
          campaignId: campaign.id,
          accessToken: '' // TODO: Need to implement a way to get the user's Gmail token for automated processing
        });
        results.push({
          campaignId: campaign.id,
          ...result
        });
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        results.push({
          campaignId: campaign.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} campaigns`,
      results
    });
  } catch (error) {
    console.error('Error processing campaigns:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 