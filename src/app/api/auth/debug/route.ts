import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Return session info (but omit sensitive tokens)
    return NextResponse.json({
      authenticated: !!session,
      user: session?.user || null,
      // Include basic session info but exclude tokens
      sessionStatus: session ? {
        expires: session.expires,
        hasToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
        error: session.error || null
      } : null,
      // Include environment check
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      }
    });
  } catch (error) {
    console.error('Auth debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get session',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.stack : null : null
      },
      { status: 500 }
    );
  }
} 