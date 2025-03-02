import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
export function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // Check if we have the environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;
      
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    if (!privateKey || !projectId || !clientEmail) {
      console.error('Firebase Admin SDK initialization error: Missing environment variables');
      return null;
    }
    
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (error) {
      console.error('Firebase Admin SDK initialization error:', error);
      return null;
    }
  }
  
  // Return existing app
  return getApps()[0];
} 