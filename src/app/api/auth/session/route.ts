import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '@/lib/firebase/firebaseAdmin';

// Initialize Firebase Admin if not already initialized
getFirebaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }
    
    // Verify the token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(token);
    const { uid, email } = decodedToken;
    
    if (!uid || !email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Set a server-side session cookie
    const sessionCookie = JSON.stringify({
      user: {
        id: uid,
        email,
      },
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    });
    
    cookies().set('next-auth.session-token', sessionCookie, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'strict'
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
} 