import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint will be called when an email is opened via a tracking pixel
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientId = searchParams.get('rid');
    
    if (!recipientId) {
      console.error('Missing recipient ID in tracking request');
      // Return a transparent 1×1 pixel GIF even if there's an error
      return new NextResponse(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Check if recipient exists
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      console.error(`Recipient with ID ${recipientId} not found`);
      // Return a transparent pixel even if there's an error
      return new NextResponse(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Record the open event
    await prisma.event.create({
      data: {
        type: 'OPEN',
        campaignRecipientId: recipientId,
        metadata: {
          userAgent: req.headers.get('user-agent') || 'Unknown',
          ip: req.headers.get('x-forwarded-for') || req.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Return a transparent 1×1 pixel GIF
    return new NextResponse(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error tracking email open:', error);
    // Return a transparent pixel even if there's an error
    return new NextResponse(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
} 