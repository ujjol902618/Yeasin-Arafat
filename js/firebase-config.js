import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import configData from '../firebase-applet-config.json';

export const firebaseConfig = configData;

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app, firebaseConfig.storageBucket);

// Error logging helper per Firebase skill requirements
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Test connection helper (optional, non-blocking)
export async function testConnection() {
  try {
    const snap = await doc(db, 'settings', 'general');
    if (snap) {
      console.info('Firestore initialized successfully.');
    }
  } catch (error) {
    console.warn('Firestore initialization notice:', error?.message);
  }
}
