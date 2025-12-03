'use client';
import { useUser } from '@/firebase/provider';

export const useAuth = () => {
  const { user, isUserLoading, userError } = useUser();
  return { user, loading: isUserLoading, error: userError };
};
