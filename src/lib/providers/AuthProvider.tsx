'use client';

import { ReactNode } from 'react';
import { AuthProvider as FirebaseAuthProvider } from '@/lib/contexts/AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
} 