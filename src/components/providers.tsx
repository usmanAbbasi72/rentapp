'use client';

import React, { type ReactNode } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SettingsProvider } from '@/context/settings-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <FirebaseClientProvider>
      <SettingsProvider>
        {children}
      </SettingsProvider>
    </FirebaseClientProvider>
  );
}
