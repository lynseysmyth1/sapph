import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

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
// This caches writes locally and syncs when online.
// Try this on BOTH web and native; failures are non-fatal and simply log a warning.
if (typeof window !== 'undefined') {
  // Use setTimeout to make this non-blocking and prevent startup hangs / white screen
  setTimeout(() => {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('[Firebase] Multiple tabs / contexts open, persistence can only be enabled in one.');
      } else if (err.code === 'unimplemented') {
        console.warn('[Firebase] The current environment does not support IndexedDB persistence.');
      } else {
        console.warn('[Firebase] Could not enable offline persistence (continuing without it):', err);
      }
    });
  }, 0);
}

// Functions no longer needed - using direct Firebase Auth for create-account

export default app
