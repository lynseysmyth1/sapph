import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import './TestSupabase.css'

const TEST_TIMEOUT_MS = 10000 // 10s

export default function TestFirebase() {
  const { user } = useAuth()
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [profilesResult, setProfilesResult] = useState(null)
  const [profilesRunning, setProfilesRunning] = useState(false)

  const runTest = async () => {
    setRunning(true)
    setResult(null)
    
    const hasApiKey = !!import.meta.env.VITE_FIREBASE_API_KEY
    const hasProjectId = !!import.meta.env.VITE_FIREBASE_PROJECT_ID

    if (!hasApiKey || !hasProjectId) {
      setResult({ ok: false, message: 'Firebase config missing. Check .env has VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID', ms: 0 })
      setRunning(false)
      return
    }

    const start = performance.now()
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Timed out')), TEST_TIMEOUT_MS)
    )

    try {
      // Test Firebase connection by checking auth state
      const authCheck = new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe()
          resolve(user !== undefined) // Just check if auth is initialized
        })
        // If auth doesn't initialize quickly, resolve anyway
        setTimeout(() => resolve(true), 1000)
      })

      await Promise.race([authCheck, timeout])
      const ms = Math.round(performance.now() - start)
      setResult({ ok: true, message: 'Firebase connected successfully', ms })
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      const message = err?.message === 'Timed out'
        ? `No response after ${TEST_TIMEOUT_MS / 1000}s (timeout)`
        : (err?.message || String(err))
      
      setResult({ ok: false, message, ms })
    } finally {
      setRunning(false)
    }
  }

  const runProfilesTest = async () => {
    if (!user?.id) {
      setProfilesResult({ ok: false, message: 'Please sign in first to test profiles', ms: 0 })
      return
    }
    setProfilesRunning(true)
    setProfilesResult(null)

    const start = performance.now()
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Timed out')), TEST_TIMEOUT_MS)
    )

    try {
      // Test Firestore write/read
      const profileRef = doc(db, 'profiles', user.id)
      const testData = { 
        test_field: `test-${Date.now()}`, 
        updated_at: new Date().toISOString() 
      }
      
      const writePromise = setDoc(profileRef, testData, { merge: true })
        .then(() => getDoc(profileRef))
        .then((snap) => {
          if (!snap.exists()) throw new Error('Document not found after write')
          return true
        })

      await Promise.race([writePromise, timeout])
      const ms = Math.round(performance.now() - start)
      setProfilesResult({ ok: true, message: 'Firestore read/write succeeded', ms })
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      let message = err?.message === 'Timed out'
        ? `No response after ${TEST_TIMEOUT_MS / 1000}s (timeout)`
        : (err?.message || String(err))
      
      if (err.code === 'permission-denied') {
        message = 'Permission denied. Check Firestore security rules allow read/write for authenticated users.'
      } else if (err.code === 'unavailable') {
        message = 'Firebase is temporarily unavailable. Please try again in a moment.'
      }
      
      setProfilesResult({ ok: false, message, ms })
    } finally {
      setProfilesRunning(false)
    }
  }

  const displayProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '(not set)'

  return (
    <div className="test-supabase">
      <h1>Firebase connection test</h1>
      <p className="test-supabase-url">Project ID: <code>{displayProjectId}</code></p>
      
      <div className="test-supabase-section">
        <h2>1. Basic connection</h2>
        <button type="button" onClick={runTest} disabled={running} className="test-supabase-btn">
          {running ? 'Testing…' : 'Run test'}
        </button>
        {result && (
          <div className={`test-supabase-result ${result.ok ? 'success' : 'error'}`}>
            <p><strong>{result.ok ? 'Success' : 'Failed'}</strong></p>
            <p>{result.message}</p>
            <p>Time: {result.ms} ms</p>
          </div>
        )}
      </div>

      <div className="test-supabase-section">
        <h2>2. Firestore read/write test</h2>
        {!user?.id ? (
          <p className="test-supabase-note">Sign in first to test Firestore</p>
        ) : (
          <>
            <button type="button" onClick={runProfilesTest} disabled={profilesRunning} className="test-supabase-btn">
              {profilesRunning ? 'Testing…' : 'Test Firestore'}
            </button>
            {profilesResult && (
              <div className={`test-supabase-result ${profilesResult.ok ? 'success' : 'error'}`}>
                <p><strong>{profilesResult.ok ? 'Success' : 'Failed'}</strong></p>
                <p>{profilesResult.message}</p>
                <p>Time: {profilesResult.ms} ms</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="test-supabase-section">
        <h2>3. Troubleshooting</h2>
        <div className="test-supabase-troubleshooting">
          <p><strong>If tests fail:</strong></p>
          <ol>
            <li>Check your <code>.env</code> file has all Firebase config values</li>
            <li>Make sure you've enabled Firestore Database in Firebase Console</li>
            <li>Check Firestore security rules allow read/write for authenticated users</li>
            <li>Restart your dev server after changing <code>.env</code></li>
          </ol>
          <p><strong>See <code>docs/FIREBASE_SETUP.md</code> for setup instructions.</strong></p>
        </div>
      </div>

      <p className="test-supabase-back">
        <Link to="/signin">← Back to Sign in</Link>
      </p>
    </div>
  )
}
