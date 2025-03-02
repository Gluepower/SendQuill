import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK for server operations (like verifying tokens)
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
};

// Check if Firebase Admin credentials are available
const hasCredentials = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

// Initialize Firebase Admin app
let adminAuth;

try {
  // Only initialize with credentials if they exist
  if (hasCredentials) {
    const adminApp = getApps().length === 0 
      ? initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        }) 
      : getApps()[0];
    
    adminAuth = getAuth(adminApp);
  } else {
    console.warn("Firebase Admin SDK credentials not found. Using fallback verification method.");
    // If we don't have credentials, we'll use a fallback method in auth-server.ts
    adminAuth = null;
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  adminAuth = null;
}

export { adminAuth }; 