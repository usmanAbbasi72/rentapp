'use client';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

import { firebaseConfig } from './config';
import { FirebaseClientProvider, useFirebase } from './client-provider';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

// Re-exporting the provider and hooks
export {
  FirebaseClientProvider,
  useFirebase,
  useCollection,
  useDoc,
};

let app;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    firestore = getFirestore(app);
  }
  return { app, auth, firestore };
}

function useAuth() {
  const context = useFirebase();
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context.auth;
}

function useFirestore() {
  const context = useFirebase();
  if (context === undefined) {
    throw new Error('useFirestore must be used within a FirebaseProvider');
  }
  return context.firestore;
}

export { initializeFirebase, useAuth, useFirestore };
export type { FirebaseApp, Auth as FirebaseAuth, Firestore as FirebaseFirestore } from 'firebase/app';
