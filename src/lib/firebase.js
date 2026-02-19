import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { Capacitor } from '@capacitor/core'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.warn(
    'Missing Firebase config. Create a .env file with VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, etc.'
  )
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Enable offline persistence for Firestore (makes writes feel instant)
// This caches writes locally and syncs when online
// Skip on native platforms - IndexedDB persistence can cause issues in Capacitor WebView
if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
  // Use setTimeout to make this non-blocking and prevent white screen
  setTimeout(() => {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('[Firebase] Multiple tabs open, persistence can only be enabled in one tab.');
      } else if (err.code === 'unimplemented') {
        console.warn('[Firebase] The current browser does not support persistence.');
      } else {
        console.warn('[Firebase] Could not enable offline persistence:', err);
      }
    });
  }, 0);
}

// Functions no longer needed - using direct Firebase Auth for create-account

export function isFirebaseConfigured() {
  return !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)
}

/** On native iOS, signInWithPopup freezes the app; use redirect so the user completes sign-in in the browser and returns. */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  if (Capacitor.isNativePlatform()) {
    return signInWithRedirect(auth, provider)
  }
  return signInWithPopup(auth, provider)
}

export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com')
  if (Capacitor.isNativePlatform()) {
    return signInWithRedirect(auth, provider)
  }
  return signInWithPopup(auth, provider)
}

/** Call on app load when using redirect (e.g. native). Completes the sign-in after the user returns from the browser. */
export function getAuthRedirectResult() {
  return getRedirectResult(auth)
}

export default app
