'use client';

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const { user, loading, signInWithGoogle, signOut } = useContext(AuthContext);
  
  const isAuthenticated = !!user;
  const isLoading = loading;
  
  return {
    user,
    isAuthenticated,
    isLoading,
    signInWithGoogle,
    signOut
  };
}