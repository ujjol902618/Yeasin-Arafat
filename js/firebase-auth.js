import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase-config.js';

const googleProvider = new GoogleAuthProvider();

function formatAuthError(error) {
  if (!error) return 'An unknown authentication error occurred.';
  const code = error.code || '';
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'your Vercel domain';
    return `Unauthorized Domain: "${host}" is not in your Firebase Authorized Domains list. Please add "${host}" (or "vercel.app") in Firebase Console > Authentication > Settings > Authorized domains.`;
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not enabled in your Firebase Console. Please click "Sign in with Google" (which is enabled by default) or enable Email/Password under Firebase Console > Authentication > Sign-in method.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password. If this is your first time, please use "Sign in with Google" or click "First-Time Setup".';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account already exists with this email address. Please switch to "Sign In" or use "Sign in with Google".';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters long.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'The Google sign-in window was closed before completing. Please try again.';
  }
  if (code === 'auth/popup-blocked') {
    return 'The sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.';
  }
  return error.message || String(error);
}

export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: formatAuthError(error), rawError: error };
  }
}

export async function registerAdmin(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: formatAuthError(error), rawError: error };
  }
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { success: false, error: formatAuthError(error), rawError: error };
  }
}

const DEFAULT_PASSCODE = 'arafat2026';
const PASSCODE_STORAGE_KEY = 'ya_admin_passcode';
const SESSION_STORAGE_KEY = 'ya_admin_session';

export function getStoredPasscode() {
  try {
    return localStorage.getItem(PASSCODE_STORAGE_KEY) || DEFAULT_PASSCODE;
  } catch (e) {
    return DEFAULT_PASSCODE;
  }
}

export function setStoredPasscode(newPasscode) {
  try {
    localStorage.setItem(PASSCODE_STORAGE_KEY, newPasscode);
    return true;
  } catch (e) {
    return false;
  }
}

export function getLocalAdminSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.authorized) {
      return session;
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

export function setLocalAdminSession(email = 'arafatujjol567@gmail.com') {
  try {
    const session = {
      authorized: true,
      user: {
        email: email || 'arafatujjol567@gmail.com',
        uid: 'admin_' + (email ? email.replace(/[^a-zA-Z0-9]/g, '_') : 'master'),
        displayName: 'Yeasin Arafat (Admin)',
      },
      method: 'passcode',
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  } catch (e) {
    return null;
  }
}

export function clearLocalAdminSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {}
}

export async function loginWithPasscode(passcode, email = 'arafatujjol567@gmail.com') {
  if (!passcode || typeof passcode !== 'string') {
    return { success: false, error: 'Please enter your Admin Passcode.' };
  }
  const clean = passcode.trim();
  const localPasscode = getStoredPasscode();

  let remotePasscode = null;
  try {
    const snap = await getDoc(doc(db, 'settings', 'general'));
    if (snap.exists() && snap.data()?.adminPasscode) {
      remotePasscode = String(snap.data().adminPasscode).trim();
      setStoredPasscode(remotePasscode);
    }
  } catch (e) {
    // Retain local passcode
  }

  const matches = [
    clean === DEFAULT_PASSCODE,
    clean === localPasscode.trim(),
    remotePasscode && clean === remotePasscode,
  ];

  if (matches.some(Boolean)) {
    const session = setLocalAdminSession(email);
    return { success: true, user: session.user };
  }
  return {
    success: false,
    error: `Incorrect Passcode. Default master passcode is "${DEFAULT_PASSCODE}".`,
  };
}

export async function logoutUser() {
  clearLocalAdminSession();
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: true };
  }
}

export function onAuthChange(callback) {
  const session = getLocalAdminSession();
  if (session && session.authorized) {
    callback(session.user);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

export function getCurrentUser() {
  const session = getLocalAdminSession();
  if (session && session.authorized) {
    return session.user;
  }
  return auth.currentUser;
}

export function checkAdminAccess(onAuthorized, onUnauthorized) {
  const session = getLocalAdminSession();
  if (session && session.authorized) {
    if (onAuthorized) onAuthorized(session.user);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      if (onAuthorized) onAuthorized(user);
    } else {
      const lateSession = getLocalAdminSession();
      if (lateSession && lateSession.authorized) {
        if (onAuthorized) onAuthorized(lateSession.user);
      } else if (onUnauthorized) {
        onUnauthorized();
      }
    }
  });
}
