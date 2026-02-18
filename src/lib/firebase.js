import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'
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

// Use explicit region so it matches where the function was deployed (default: us-central1)
const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1'
export const functions = getFunctions(app, functionsRegion)

/** Callable: create account on backend, returns { customToken }. Use with signInWithCustomToken(auth, customToken). */
export const createAccountWithTokenCallable = httpsCallable(functions, 'createAccountWithToken')

/**
 * URL for createAccountWithToken. On native we call this with CapacitorHttp (no WebView/CORS).
 * - If VITE_FIREBASE_CREATE_ACCOUNT_URL is set (e.g. 2nd gen URL from Console), use that.
 * - Else use 1st gen URL (only valid if the function is deployed as 1st gen via firebase-functions/v1).
 */
export function getCreateAccountCallableUrl() {
  const envUrl = import.meta.env.VITE_FIREBASE_CREATE_ACCOUNT_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) return envUrl.trim()
  const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1'
  const projectId = firebaseConfig.projectId
  if (!projectId) return null
  return `https://${region}-${projectId}.cloudfunctions.net/createAccountWithToken`
}

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
