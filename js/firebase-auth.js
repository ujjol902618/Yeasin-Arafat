import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './firebase-config.js';

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

export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function checkAdminAccess(onAuthorized, onUnauthorized) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      if (onAuthorized) onAuthorized(user);
    } else {
      if (onUnauthorized) onUnauthorized();
    }
  });
}
