'use client';
import { useUser } from '@/firebase';

export const useAuth = () => {
  const { user, loading, error } = useUser();
  if (error) {
    // This can happen if the user is signed out and the page requires auth.
    // The dashboard layout will redirect to the login page.
    console.log(`useAuth error: ${error.message}`);
  }
  return { user, loading };
};
