'use client';

import React, { type ReactNode } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <FirebaseClientProvider>{children}</FirebaseClientProvider>;
}
