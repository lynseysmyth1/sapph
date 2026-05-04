/**
 * Temporary one-off script: deletes all `likes` documents where fromUserId
 * matches the lynseysmyth@gmail.com account (UID: NVaXWjPsTFXznqkaic7tfLwMcFf1).
 *
 * Usage (run from project root):
 *   SAPPH_PASSWORD=yourpassword node scripts/clear-likes.js
 *
 * Delete this file after use.
 */

const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth')
const { getFirestore, collection, query, where, getDocs, deleteDoc } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: 'AIzaSyA2MgI00FN3mxJgwwq8KhL3-GSffxDYheA',
  authDomain: 'sapph-b4f8e.firebaseapp.com',
  projectId: 'sapph-b4f8e',
  storageBucket: 'sapph-b4f8e.firebasestorage.app',
  messagingSenderId: '82699378083',
  appId: '1:82699378083:web:26fcc6b3f6100330828e16'
}

const LYNSEY_UID = 'NVaXWjPsTFXznqkaic7tfLwMcFf1'
const EMAIL = 'lynseysmyth@gmail.com'
const PASSWORD = process.env.SAPPH_PASSWORD

if (!PASSWORD) {
  console.error('Error: SAPPH_PASSWORD environment variable is required.')
  console.error('Usage: SAPPH_PASSWORD=yourpassword node scripts/clear-likes.js')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function clearLikes() {
  console.log(`Signing in as ${EMAIL}...`)
  await signInWithEmailAndPassword(auth, EMAIL, PASSWORD)
  console.log('Signed in successfully.')

  console.log(`Querying likes where fromUserId == ${LYNSEY_UID}...`)
  const q = query(
    collection(db, 'likes'),
    where('fromUserId', '==', LYNSEY_UID)
  )
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    console.log('No likes found to delete.')
  } else {
    console.log(`Found ${snapshot.size} like(s). Deleting...`)
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)))
    console.log(`Successfully deleted ${snapshot.size} like(s).`)
  }

  await signOut(auth)
  console.log('Signed out. Done.')
}

clearLikes().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
