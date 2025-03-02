"use client";

import React, { createContext, useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      setLoading(false);
      
      // When user changes, update the token cookie
      if (user) {
        // Get the ID token
        const token = await user.getIdToken();
        // Store it in a cookie that's accessible by the server
        Cookies.set('firebase-token', token, {
          expires: 7, // 7 days
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        
        // Sync the token with the server-side session
        try {
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });
          
          if (!response.ok) {
            console.error('Failed to sync authentication token with session');
          }
        } catch (error) {
          console.error('Error syncing auth token with session:', error);
        }
      } else {
        // Remove the cookie when user signs out
        Cookies.remove('firebase-token', { path: '/' });
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Add Gmail API scopes individually for proper authorization
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    provider.addScope('https://www.googleapis.com/auth/gmail.modify');
    
    try {
      // Set custom parameters to avoid multiple consent screens
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline'
      });
      
      const result = await signInWithPopup(auth, provider);
      // Get the OAuth access token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        const token = credential.accessToken;
        // Store the OAuth token in a cookie for server-side access
        if (token) {
          Cookies.set('gmail-token', token, {
            expires: 1, // 1 day
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
          console.log("Gmail OAuth Token acquired");
        }
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
      // Also remove the cookie
      Cookies.remove('firebase-token', { path: '/' });
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
