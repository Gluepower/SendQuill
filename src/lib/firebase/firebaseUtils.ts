import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  getAuth,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { NextRequest } from "next/server";
import { getApp } from "firebase/app";
import { getAuth as getAdminAuth, UserRecord } from "firebase-admin/auth";
import { initializeFirebaseAdmin } from "./firebaseAdmin";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

/**
 * Extract and verify the Firebase ID token from a request
 * @param request The Next.js request object
 * @returns The Firebase user if authenticated, null otherwise
 */
export const getFirebaseUser = async (request: NextRequest): Promise<UserRecord | null> => {
  try {
    // Initialize Firebase Admin if not already initialized
    initializeFirebaseAdmin();
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return null;
    }

    // Verify the token
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    
    // Get the user from the token
    const user = await getAdminAuth().getUser(decodedToken.uid);
    return user;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
