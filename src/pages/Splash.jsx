import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import { signInWithGoogle, signInWithApple, isFirebaseConfigured } from '../lib/firebase'
import SignIn from './SignIn'
import './Splash.css'

const SOCIAL_REDIRECT_TIMEOUT_MS = 6000

export default function Splash() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('choice') // 'choice' | 'method'
  const [intent, setIntent] = useState(null) // 'create' | 'signin'
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [authError, setAuthError] = useState('')
  const [socialLoading, setSocialLoading] = useState(null) // 'apple' | 'google' | null

  const isNative = Capacitor.isNativePlatform()
  // On native, hide Google/Apple to avoid redirect freeze/timeout; email sign-in only
  const showSocial = isFirebaseConfigured() && !isNative

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true })
    }
  }, [user, loading, navigate])

  // Defer state update so tap handler returns immediately (avoids blocking main thread on iOS)
  const goToMethod = (createOrSignIn) => {
    setAuthError('')
    requestAnimationFrame(() => {
      setIntent(createOrSignIn)
      setStep('method')
    })
  }

  const goBack = () => {
    setAuthError('')
    setStep('choice')
    setIntent(null)
  }

  const handleEmail = () => {
    setAuthError('')
    // Defer opening sheet so tap handler returns and UI can update (reduces freeze on native)
    setTimeout(() => setShowEmailForm(true), 0)
  }

  const handleGoogle = async () => {
    setAuthError('')
    if (!showSocial) {
      setAuthError('Google sign-in is not configured.')
      return
    }
    setSocialLoading('google')
    try {
      if (isNative) {
        const redirectPromise = signInWithGoogle()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('redirect_timeout')), SOCIAL_REDIRECT_TIMEOUT_MS)
        )
        await Promise.race([redirectPromise, timeoutPromise])
        navigate('/home', { replace: true })
      } else {
        await signInWithGoogle()
        navigate('/home', { replace: true })
      }
    } catch (err) {
      const msg = err?.message || err?.code || ''
      if (msg.includes('redirect_timeout')) {
        setAuthError('Sign-in is taking too long. Please use "Sign in with email" below.')
      } else {
        setAuthError(err?.message || 'Google sign-in failed. Please try again.')
      }
    } finally {
      setSocialLoading(null)
    }
  }

  const handleApple = async () => {
    setAuthError('')
    if (!showSocial) {
      setAuthError('Apple sign-in is not configured.')
      return
    }
    setSocialLoading('apple')
    try {
      if (isNative) {
        const redirectPromise = signInWithApple()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('redirect_timeout')), SOCIAL_REDIRECT_TIMEOUT_MS)
        )
        await Promise.race([redirectPromise, timeoutPromise])
        navigate('/home', { replace: true })
      } else {
        await signInWithApple()
        navigate('/home', { replace: true })
      }
    } catch (err) {
      const msg = err?.message || err?.code || ''
      if (msg.includes('redirect_timeout')) {
        setAuthError('Sign-in is taking too long. Please use "Sign in with email" below.')
      } else {
        setAuthError(err?.message || 'Apple sign-in failed. Please try again.')
      }
    } finally {
      setSocialLoading(null)
    }
  }

  if (loading) return <div className="app-loading">Loading…</div>

  return (
    <div className="splash">
      <div className="splash-overlay" aria-hidden="true" />
      <div className="splash-content">
        <div className="splash-spacer" aria-hidden="true" />
        <div className="splash-logo-wrap">
          <img
            src="/logos/logo-white.png"
            alt="Sapph"
            className="splash-logo-img"
          />
        </div>
        <div className="splash-buttons">
          {step === 'choice' && (
            <>
              <button
                type="button"
                className="splash-btn splash-btn-primary"
                onClick={() => goToMethod('create')}
                aria-label="Create account"
              >
                Create Account
              </button>
              <button
                type="button"
                className="splash-btn splash-btn-secondary"
                onClick={() => goToMethod('signin')}
                aria-label="Sign in"
              >
                Sign In
              </button>
            </>
          )}

          {step === 'method' && (
            <>
              <button
                type="button"
                className="splash-btn-back"
                onClick={goBack}
                aria-label="Back"
              >
                ← Back
              </button>
              <button
                type="button"
                className="splash-btn-method splash-btn-method-email"
                onClick={handleEmail}
                disabled={!!socialLoading}
                aria-label={intent === 'create' ? 'Create account with email' : 'Sign in with email'}
              >
                <svg className="splash-btn-email-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                  <path d="M22 6L12 13 2 6" />
                </svg>
                <span className="splash-social-btn-text">
                  {intent === 'create' ? 'Create account with email' : 'Sign in with email'}
                </span>
              </button>
              {isNative && (
                <p className="splash-native-hint">Use email above to sign in or create an account.</p>
              )}
              {showSocial && (
                <>
                  <button
                    type="button"
                    className="splash-btn-method splash-btn-google"
                    onClick={handleGoogle}
                    disabled={!!socialLoading}
                    aria-label="Continue with Google"
                  >
                    {socialLoading === 'google' ? (
                      <span className="splash-social-btn-text">Signing in…</span>
                    ) : (
                      <>
                        <span className="splash-btn-google-icon" aria-hidden="true" />
                        <span className="splash-social-btn-text">Continue with Google</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="splash-btn-method splash-btn-apple"
                    onClick={handleApple}
                    disabled={!!socialLoading}
                    aria-label="Continue with Apple"
                  >
                    {socialLoading === 'apple' ? (
                      <span className="splash-social-btn-text">Signing in…</span>
                    ) : (
                      <>
                        <span className="splash-btn-apple-icon" aria-hidden="true" />
                        <span className="splash-social-btn-text">Continue with Apple</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}

          {authError && (
            <div className="splash-auth-error" role="alert">
              {authError}
            </div>
          )}
        </div>
      </div>

      <div
        className={`splash-signin-overlay ${showEmailForm ? 'is-visible' : ''}`}
        onClick={() => setShowEmailForm(false)}
        aria-hidden={!showEmailForm}
      >
        <div className="splash-signin-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          {showEmailForm && (
            <SignIn
              key={intent === 'signin' ? 'signin' : 'create'}
              onBack={() => setShowEmailForm(false)}
              initialStep="form"
              initialIsSignIn={intent === 'signin'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
