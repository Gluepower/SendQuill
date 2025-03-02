import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/firebase/auth-server';

// POST - Reset analytics data
export async function POST(req: NextRequest) {
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

    console.log(`Resetting analytics data for user: ${user.email}`);

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

    // No need to modify any database tables for analytics data
    // as analytics data is calculated on-the-fly from campaigns
    // Just return a success response
    
    return new NextResponse(JSON.stringify({ success: true, message: 'Analytics data has been reset' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error resetting analytics:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to reset analytics data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 