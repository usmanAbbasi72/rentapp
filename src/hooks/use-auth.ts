'use client';
import { useAuth as useFirebaseAuth } from '@/firebase/client-provider';

export const useAuth = () => {
  const { user, loading } = useFirebaseAuth();
  return { user, loading, error: null };
};
