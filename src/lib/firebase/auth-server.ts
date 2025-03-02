import { NextRequest } from 'next/server';
import { adminAuth } from './admin';

// Helper function to extract token from Authorization header
const extractToken = (req: NextRequest): string | null => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split('Bearer ')[1];
};

// Helper function to decode a JWT token
// This is used as a fallback when Firebase Admin is not properly configured
const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = JSON.parse(Buffer.from(base64, 'base64').toString());
    return jsonPayload;
  } catch (error) {
    console.error("Failed to decode JWT token:", error);
    return null;
  }
};

// Function to get the current Firebase user from a request
export async function getCurrentUser(req: NextRequest) {
  try {
    // Get token from Authorization header
    const token = extractToken(req);
    if (!token) {
      // Also check the 'firebase-token' cookie as fallback
      const tokenCookie = req.cookies.get('firebase-token');
      if (!tokenCookie?.value) {
        return null;
      }
      
      // If Firebase Admin is not available, use basic JWT decoding
      if (!adminAuth) {
        console.warn("Firebase Admin not available, using basic JWT decoding");
        return decodeJwt(tokenCookie.value);
      }
      
      try {
        // Try to verify the token using Firebase Admin
        return await adminAuth.verifyIdToken(tokenCookie.value);
      } catch (error) {
        // If Firebase Admin fails, fallback to basic JWT decoding
        console.warn("Firebase Admin token verification failed, falling back to basic decoding:", error);
        return decodeJwt(tokenCookie.value);
      }
    }

    // If Firebase Admin is not available, use basic JWT decoding
    if (!adminAuth) {
      console.warn("Firebase Admin not available, using basic JWT decoding");
      return decodeJwt(token);
    }
    
    try {
      // Try to verify the token using Firebase Admin
      return await adminAuth.verifyIdToken(token);
    } catch (error) {
      // If Firebase Admin fails, fallback to basic JWT decoding
      console.warn("Firebase Admin token verification failed, falling back to basic decoding:", error);
      return decodeJwt(token);
    }
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
} 