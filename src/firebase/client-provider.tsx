'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { getSdks } from '@/firebase/index';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
    const firebaseServices = useMemo(() => {
        if (typeof window !== 'undefined') {
            if (getApps().length === 0 && firebaseConfig.apiKey) {
                const firebaseApp = initializeApp(firebaseConfig);
                return getSdks(firebaseApp);
            } else if (getApps().length > 0) {
                return getSdks(getApp());
            }
        }
        return { firebaseApp: null, auth: null, firestore: null };
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
