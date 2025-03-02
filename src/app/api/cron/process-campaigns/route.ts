import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processAllPendingCampaigns } from '@/lib/campaigns/processCampaign';

// This endpoint is designed to be called by a cron job service like Vercel Cron
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

    // Check for campaigns that are scheduled and should be sent now
    const now = new Date();
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now
        }
      },
      select: { id: true }
    });

    // Update these campaigns to SENDING status
    for (const campaign of scheduledCampaigns) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'SENDING' }
      });
    }

    // Process all campaigns that are now in SENDING status
    const result = await processAllPendingCampaigns();

    return NextResponse.json({
      success: true,
      scheduledCampaignsProcessed: scheduledCampaigns.length,
      processingResult: result
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 