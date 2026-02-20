import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import SignIn from './SignIn'
import './Splash.css'

export default function Splash() {
  const { authLoading } = useAuth()
  const [step, setStep] = useState('choice') // 'choice' | 'method'
  const [intent, setIntent] = useState(null) // 'create' | 'signin'
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [authError, setAuthError] = useState('')
  const isNative = Capacitor.isNativePlatform()

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

  if (authLoading) return <div className="app-loading">Loading…</div>

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
                disabled={false}
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
