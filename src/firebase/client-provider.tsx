'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
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

interface FirebaseServices {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices>({
    firebaseApp: null,
    auth: null,
    firestore: null,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let app;
      if (getApps().length === 0) {
        if (firebaseConfig.apiKey) {
          app = initializeApp(firebaseConfig);
        } else {
          console.warn("Firebase config not found, skipping initialization.");
          return;
        }
      } else {
        app = getApp();
      }
      setFirebaseServices(getSdks(app));
    }
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
