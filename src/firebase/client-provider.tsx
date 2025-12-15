'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase/index';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
    const firebaseServices = useMemo(() => {
        // This will now only run on the client, preventing server-side initialization.
        return initializeFirebase();
    }, []);
  
    return (
      <FirebaseProvider
        firebaseApp={firebaseServices.firebaseApp as FirebaseApp}
        auth={firebaseServices.auth as Auth}
        firestore={firebaseServices.firestore as Firestore}
      >
        {children}
      </FirebaseProvider>
    );
}
