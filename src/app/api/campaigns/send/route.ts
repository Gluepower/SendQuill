import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/firebase/auth-server';
import { prisma } from '@/lib/prisma';
import { sendCampaign } from '@/lib/email/campaign-sender';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Check if user is authenticated
    if (!user || !user.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const { campaignId, accessToken } = await req.json();

    if (!campaignId) {
      return new NextResponse(JSON.stringify({ error: 'Campaign ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!accessToken) {
      return new NextResponse(JSON.stringify({ error: 'Gmail access token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      return new NextResponse(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return new NextResponse(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (campaign.userId !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized to send this campaign' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send the campaign
    const result = await sendCampaign({ campaignId, accessToken });

    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return new NextResponse(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An error occurred while sending the campaign' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 