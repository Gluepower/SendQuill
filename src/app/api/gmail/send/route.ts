import { NextRequest, NextResponse } from 'next/server';
import { sendEmailWithToken } from '@/lib/gmail/firebaseGmailApi';
import { auth } from '@/lib/firebase/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };

  initializeApp({
    credential: cert(serviceAccount as any)
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get the Firebase ID token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase ID token
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      // Get the Gmail access token from the request body
      const { to, subject, body, cc, bcc, accessToken } = await request.json();
      
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Gmail access token is required' },
          { status: 400 }
        );
      }

      if (!to || !subject || !body) {
        return NextResponse.json(
          { error: 'To, subject, and body are required fields' },
          { status: 400 }
        );
      }

      // Send the email using the Gmail API
      const result = await sendEmailWithToken({
        to,
        subject,
        body,
        cc,
        bcc,
        accessToken
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return NextResponse.json(
        { error: 'Invalid Firebase ID token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 