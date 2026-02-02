import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import './TestSupabase.css'

const TEST_TIMEOUT_MS = 15000 // 15s
const PROFILES_TEST_TIMEOUT_MS = 90000 // 90s (same as onboarding Phase 1)

export default function TestSupabase() {
  const { user } = useAuth()
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [profilesResult, setProfilesResult] = useState(null)
  const [profilesRunning, setProfilesRunning] = useState(false)

  const runTest = async () => {
    setRunning(true)
    setResult(null)
    const url = import.meta.env.VITE_SUPABASE_URL
    const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!url?.trim()) {
      setResult({ ok: false, message: 'VITE_SUPABASE_URL is missing in .env', ms: 0 })
      setRunning(false)
      return
    }
    if (!hasKey) {
      setResult({ ok: false, message: 'VITE_SUPABASE_ANON_KEY is missing in .env', ms: 0 })
      setRunning(false)
      return
    }

    const start = performance.now()
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Timed out')), TEST_TIMEOUT_MS)
    )
    const sessionCall = supabase.auth.getSession()

    try {
      await Promise.race([sessionCall, timeout])
      const ms = Math.round(performance.now() - start)
      setResult({ ok: true, message: 'Supabase responded successfully', ms })
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      let message = err?.message === 'Timed out'
        ? `No response after ${TEST_TIMEOUT_MS / 1000}s (timeout)`
        : (err?.message || String(err))
      
      if (err?.message === 'Timed out' || ms >= TEST_TIMEOUT_MS - 100) {
        message += ' — Your Supabase project is likely PAUSED. Go to Supabase Dashboard → click "Restore" → wait 1-2 minutes, then try again.'
      }
      
      setResult({ ok: false, message, ms })
    } finally {
      setRunning(false)
    }
  }

  const runProfilesTest = async () => {
    if (!user?.id) {
      setProfilesResult({ ok: false, message: 'Please sign in first to test profiles upsert', ms: 0 })
      return
    }
    setProfilesRunning(true)
    setProfilesResult(null)

    const start = performance.now()
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Timed out')), PROFILES_TEST_TIMEOUT_MS)
    )
    // Same minimal upsert as Phase 1 in onboarding
    const minimalPayload = { id: user.id, onboarding_completed: false, updated_at: new Date().toISOString() }
    const profilesCall = supabase.from('profiles').upsert(minimalPayload, { onConflict: 'id' }).select()

    try {
      const { error } = await Promise.race([profilesCall, timeout])
      const ms = Math.round(performance.now() - start)
      if (error) throw error
      setProfilesResult({ ok: true, message: 'Profiles upsert succeeded', ms })
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      let message = err?.message === 'Timed out'
        ? `No response after ${PROFILES_TEST_TIMEOUT_MS / 1000}s (timeout) — this is why onboarding times out!`
        : (err?.message || String(err))
      
      if (err?.message === 'Timed out' || ms >= PROFILES_TEST_TIMEOUT_MS - 100) {
        message += ' Your Supabase project is likely PAUSED. Go to Supabase Dashboard → click "Restore" → wait 1-2 minutes, then try again.'
      }
      
      setProfilesResult({ ok: false, message, ms })
    } finally {
      setProfilesRunning(false)
    }
  }

  const displayUrl = import.meta.env.VITE_SUPABASE_URL
    ? new URL(import.meta.env.VITE_SUPABASE_URL).hostname
    : '(not set)'

  return (
    <div className="test-supabase">
      <h1>Supabase connection test</h1>
      <p className="test-supabase-url">URL: <code>{displayUrl}</code></p>
      
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
        <h2>2. Profiles table upsert (onboarding Phase 1)</h2>
        {!user?.id ? (
          <p className="test-supabase-note">Sign in first to test profiles upsert</p>
        ) : (
          <>
            <button type="button" onClick={runProfilesTest} disabled={profilesRunning} className="test-supabase-btn">
              {profilesRunning ? 'Testing…' : 'Test profiles upsert'}
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
          <p><strong>If tests timeout or fail:</strong></p>
          <ol>
            <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Supabase Dashboard</a></li>
            <li>Click your project</li>
            <li>If you see "Project paused" or "Restore", click <strong>Restore</strong></li>
            <li>Wait 1-2 minutes for the project to wake up</li>
            <li>Run the tests again</li>
          </ol>
          <p><strong>Free tier projects pause after 7 days of inactivity.</strong> Just click Restore and wait!</p>
        </div>
      </div>

      <p className="test-supabase-back">
        <Link to="/signin">← Back to Sign in</Link>
      </p>
    </div>
  )
}
