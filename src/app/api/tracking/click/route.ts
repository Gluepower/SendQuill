import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint will be called when a user clicks a tracked link in an email
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientId = searchParams.get('rid');
    const targetUrl = searchParams.get('url');
    
    if (!recipientId || !targetUrl) {
      console.error('Missing recipient ID or target URL in tracking request');
      return NextResponse.redirect(targetUrl || '/');
    }

    // Record the click event
    try {
      await prisma.event.create({
        data: {
          type: 'CLICK',
          campaignRecipientId: recipientId,
          metadata: {
            url: targetUrl,
            userAgent: req.headers.get('user-agent') || 'Unknown',
            ip: req.headers.get('x-forwarded-for') || req.ip || 'Unknown',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Error recording click event:', error);
      // Continue with redirect even if recording fails
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(targetUrl);
    
    // Redirect to the target URL
    return NextResponse.redirect(decodedUrl);
  } catch (error) {
    console.error('Error tracking email click:', error);
    // Redirect to homepage if anything goes wrong
    return NextResponse.redirect('/');
  }
} 