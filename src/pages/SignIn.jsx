import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import { auth, signInWithGoogle, signInWithApple, isFirebaseConfigured } from '../lib/firebase'
import './SignIn.css'

const APPLE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
)
const GOOGLE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)
const FACEBOOK_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

export default function SignIn({ onBack, initialShowForm = false, initialStep, initialIsSignIn = true }) {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // step: 'choice' | 'method' | 'form' (email+password) | 'forgot' (reset password)
  const [step, setStep] = useState(initialStep === 'form' ? 'form' : (initialShowForm ? 'method' : 'choice'))
  const [isSignIn, setIsSignIn] = useState(initialIsSignIn)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null) // 'apple' | 'google' | null
  const [message, setMessage] = useState({ type: '', text: '' })
  const formCardRef = useRef(null)
  const choosingRef = useRef(false)
  // Always show Apple/Google buttons; show error on tap if Firebase not configured
  const showSocial = true

  // If already signed in, go to home
  useEffect(() => {
    if (authLoading || !user) return
    navigate('/home', { replace: true })
  }, [user, authLoading, navigate])


  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const goToMethod = (signInMode) => {
    setIsSignIn(signInMode)
    setStep('method')
    setMessage({ type: '', text: '' })
  }

  const goToChoice = () => {
    setStep('choice')
    setMessage({ type: '', text: '' })
  }

  const goToForm = () => {
    setStep('form')
    setMessage({ type: '', text: '' })
  }

  const handleButtonClick = (signInMode) => {
    setIsSignIn(signInMode)
    setStep('method')
  }

  // Use pointer + click so taps work on iOS and desktop; guard avoids double fire
  const onChooseCreateAccount = (e) => {
    if (choosingRef.current) return
    choosingRef.current = true
    setTimeout(() => { choosingRef.current = false }, 400)
    e.preventDefault()
    e.stopPropagation()
    goToMethod(false)
  }
  const onChooseSignIn = (e) => {
    if (choosingRef.current) return
    choosingRef.current = true
    setTimeout(() => { choosingRef.current = false }, 400)
    e.preventDefault()
    e.stopPropagation()
    goToMethod(true)
  }

  const handleGoogle = async () => {
    setMessage({ type: '', text: '' })
    if (!isFirebaseConfigured()) {
      showMessage('error', 'Google sign-in is not configured. Add Firebase keys to .env.')
      return
    }
    setSocialLoading('google')
    try {
      await signInWithGoogle()
      if (onBack) onBack()
      if (Capacitor.isNativePlatform()) {
        window.location.hash = '#/home'
        setTimeout(() => window.location.reload(), 100)
      } else {
        navigate('/home', { replace: true })
      }
    } catch (err) {
      const msg = err?.message || 'Google sign-in failed. Please try again.'
      showMessage('error', msg)
    } finally {
      setSocialLoading(null)
    }
  }

  const handleApple = async () => {
    setMessage({ type: '', text: '' })
    if (!isFirebaseConfigured()) {
      showMessage('error', 'Apple sign-in is not configured. Add Firebase keys to .env.')
      return
    }
    setSocialLoading('apple')
    try {
      await signInWithApple()
      if (onBack) onBack()
      if (Capacitor.isNativePlatform()) {
        window.location.hash = '#/home'
        setTimeout(() => window.location.reload(), 100)
      } else {
        navigate('/home', { replace: true })
      }
    } catch (err) {
      const msg = err?.message || 'Apple sign-in failed. Please try again.'
      showMessage('error', msg)
    } finally {
      setSocialLoading(null)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      showMessage('error', 'Please enter your email')
      return
    }
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await sendPasswordResetEmail(auth, email.trim())
      showMessage('success', 'Check your email for a link to reset your password. If you don’t see it, check spam.')
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        showMessage('error', 'No account found with this email.')
      } else if (err?.code === 'auth/invalid-email') {
        showMessage('error', 'Invalid email address.')
      } else {
        showMessage('error', err?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const EMAIL_AUTH_TIMEOUT_MS = 15000

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      showMessage('error', 'Please enter your email')
      return
    }
    if (!password.trim()) {
      showMessage('error', 'Please enter your password')
      return
    }
    setLoading(true)
    setMessage({ type: '', text: '' })
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('auth_timeout')), EMAIL_AUTH_TIMEOUT_MS)
    )
    try {
      if (isSignIn) {
        const authPromise = signInWithEmailAndPassword(auth, email.trim(), password.trim())
        await Promise.race([authPromise, timeoutPromise])
        if (onBack) onBack()
        // Navigate immediately - no page reload
        navigate('/home', { replace: true })
        if (Capacitor.isNativePlatform()) {
          window.location.hash = '#/home'
          // Don't reload - let React Router handle navigation
        }
        return
      } else {
        // Create account: use Firebase Auth directly (app loads from https, so origin is allowed)
        const authPromise = createUserWithEmailAndPassword(auth, email.trim(), password.trim())
        await Promise.race([authPromise, timeoutPromise])
        if (onBack) onBack()
        // Navigate to home - React Router will handle routing
        // Don't set hash on native (can cause reload and reset state)
        navigate('/home', { replace: true })
        return
      }
    } catch (err) {
      const msg = err.message || ''
      const code = err.code || ''
      console.error('Auth error:', err)
      if (code === 'auth/email-already-in-use') {
        showMessage('error', 'An account with this email already exists. Please sign in instead.')
      } else if (err?.message === 'auth_timeout') {
        const timeoutHint = !isSignIn
          ? ' Check your connection. If it keeps failing, use the web version (https) to create an account.'
          : ' Firebase may not allow this connection from the app. Use the web version (https) to sign in, or see docs/TROUBLESHOOTING_TESTFLIGHT.md.'
        showMessage('error', `Request is taking too long.${timeoutHint}`)
      } else if (err.code === 'auth/too-many-requests') {
        showMessage('error', 'Too many attempts. Please wait a moment and try again.')
      } else if (err.code === 'auth/weak-password') {
        showMessage('error', 'Password is too weak. Please use a stronger password (at least 6 characters).')
      } else if (err.code === 'auth/invalid-email') {
        showMessage('error', 'Invalid email address. Please check and try again.')
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        showMessage('error', 'No account found with this email. Please create an account instead.')
      } else if (err.code === 'auth/email-already-in-use') {
        showMessage('error', 'An account with this email already exists. Please sign in instead.')
      } else if (err.code === 'auth/wrong-password') {
        showMessage('error', 'Incorrect password. Please try again.')
      } else if (Capacitor.isNativePlatform() && (err.code === 'auth/network-request-failed' || err.code === 'auth/internal-error' || /configuration|CORS|domain/i.test(msg))) {
        showMessage('error', 'Firebase doesn’t allow sign-in from this app’s origin. Use the web version (https) to sign in, or host this app at an https URL and add that domain in Firebase → Authentication → Authorized domains. See docs/TROUBLESHOOTING_TESTFLIGHT.md.')
      } else if (/load failed|failed to load|network error|fetch failed/i.test(msg) || err.name === 'TypeError') {
        showMessage('error', 'Network request failed. Check your connection and try again. If it keeps failing in the app, create your account on the web version, then sign in here.')
      } else {
        showMessage('error', msg || `Failed: ${err.code || 'Unknown error'}. Please try again.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`signin ${onBack ? 'signin-in-overlay' : ''}`}>
      {!onBack && (
        <div className="signin-overlay" aria-hidden="true" />
      )}
      
      {step === 'choice' && (
        <div className="signin-content">
          {!onBack && (
            <div className="signin-logo-wrap">
              <h1 className="signin-logo-text">//Sapph</h1>
            </div>
          )}
          {message.text && (
            <div className={`signin-message signin-message--${message.type}`}>
              {message.text}
            </div>
          )}
          <div className="signin-buttons">
            <button
              type="button"
              className="signin-btn signin-btn-primary"
              onPointerUp={onChooseCreateAccount}
              onClick={onChooseCreateAccount}
              disabled={loading || socialLoading}
              aria-label="Create Account"
            >
              Create Account
            </button>
            <button
              type="button"
              className="signin-btn signin-btn-secondary"
              onPointerUp={onChooseSignIn}
              onClick={onChooseSignIn}
              disabled={loading || socialLoading}
              aria-label="Sign In"
            >
              Sign In
            </button>
            {showSocial && (
              <>
                <div className="signin-divider">or</div>
                <button
                  type="button"
                  className="signin-btn signin-btn-google"
                  onClick={handleGoogle}
                  disabled={!!loading || !!socialLoading}
                  aria-label="Continue with Google"
                >
                  {socialLoading === 'google' ? (
                    <span>Signing in…</span>
                  ) : (
                    <>
                      {GOOGLE_ICON}
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="signin-btn signin-btn-apple"
                  onClick={handleApple}
                  disabled={!!loading || !!socialLoading}
                  aria-label="Continue with Apple"
                >
                  {socialLoading === 'apple' ? (
                    <span>Signing in…</span>
                  ) : (
                    <>
                      {APPLE_ICON}
                      <span>Continue with Apple</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {step === 'method' && (
        <div className="signin-content signin-content-method">
          {message.text && (
            <div className={`signin-message signin-message--${message.type}`}>
              {message.text}
            </div>
          )}
          <div className="signin-buttons">
            <button
              type="button"
              className="signin-btn signin-btn-back"
              onClick={() => (onBack ? onBack() : goToChoice())}
              disabled={!!loading || !!socialLoading}
              aria-label="Back"
            >
              ← Back
            </button>
            <button
              type="button"
              className="signin-btn signin-btn-method signin-btn-email"
              onClick={goToForm}
              disabled={!!loading || !!socialLoading}
              aria-label={isSignIn ? 'Sign in with email' : 'Create account with email'}
            >
              <svg className="signin-btn-email-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                <path d="M22 6L12 13 2 6" />
              </svg>
              <span>{isSignIn ? 'Sign in with email' : 'Create account with email'}</span>
            </button>
            {showSocial && (
              <>
                <button
                  type="button"
                  className="signin-btn signin-btn-method signin-btn-google"
                  onClick={handleGoogle}
                  disabled={!!loading || !!socialLoading}
                  aria-label="Continue with Google"
                >
                  {socialLoading === 'google' ? (
                    <span>Signing in…</span>
                  ) : (
                    <>
                      {GOOGLE_ICON}
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="signin-btn signin-btn-method signin-btn-apple"
                  onClick={handleApple}
                  disabled={!!loading || !!socialLoading}
                  aria-label="Continue with Apple"
                >
                  {socialLoading === 'apple' ? (
                    <span>Signing in…</span>
                  ) : (
                    <>
                      {APPLE_ICON}
                      <span>Continue with Apple</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {step === 'forgot' && onBack ? (
        <div className="signin-sheet-form" role="dialog" aria-label="Reset password">
          <div className="signin-card" ref={formCardRef}>
            <h2 className="signin-form-title">Reset password</h2>
            <p className="signin-forgot-hint">Enter your email and we’ll send you a link to reset your password.</p>
            {message.text && (
              <div className={`signin-message signin-message--${message.type}`}>{message.text}</div>
            )}
            <form className="signin-form" onSubmit={handleForgotSubmit}>
              <label className="signin-label" htmlFor="signin-forgot-email">Email</label>
              <input
                id="signin-forgot-email"
                type="email"
                className="signin-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                autoFocus
              />
              <button type="submit" className="signin-btn signin-btn-submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                className="signin-link"
                onClick={() => { setStep('form'); setMessage({ type: '', text: '' }) }}
                disabled={loading}
              >
                ← Back to sign in
              </button>
            </form>
            <div className="signin-footer">
              <button type="button" className="signin-back" onClick={onBack}>Cancel</button>
            </div>
          </div>
        </div>
      ) : step === 'form' && onBack ? (
        /* Bottom sheet: form fades in and replaces the buttons */
        <div className="signin-sheet-form" role="dialog" aria-label={isSignIn ? 'Sign in' : 'Create account'}>
          <div className="signin-card" ref={formCardRef}>
            <h2 className="signin-form-title">{isSignIn ? 'Sign in' : 'Create account'}</h2>
            {message.text && (
              <div className={`signin-message signin-message--${message.type}`}>
                {message.text}
              </div>
            )}
            <form className="signin-form" onSubmit={handleEmailSubmit}>
              <label className="signin-label" htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                className="signin-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                autoFocus
              />
              <label className="signin-label" htmlFor="signin-password">Password</label>
              <div className="signin-password-row">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  className="signin-input signin-input-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="signin-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="signin-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="signin-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {isSignIn && (
                <button
                  type="button"
                  className="signin-forgot-link"
                  onClick={() => { setStep('forgot'); setMessage({ type: '', text: '' }) }}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              )}
              <button type="submit" className="signin-btn signin-btn-submit" disabled={loading}>
                {loading ? (isSignIn ? 'Signing in…' : 'Creating account…') : (isSignIn ? 'Sign In' : 'Create Account')}
              </button>
              <button
                type="button"
                className="signin-link"
                onClick={() => {
                  if (onBack && initialStep === 'form') {
                    onBack()
                  } else {
                    setStep('method')
                    setEmail('')
                    setPassword('')
                    setMessage({ type: '', text: '' })
                  }
                }}
                disabled={loading}
              >
                ← Back
              </button>
            </form>
            <div className="signin-legal">
              By tapping Sign in or Create account, you agree to our{' '}
              <a href="/terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>. Learn how we process your data in our{' '}
              <a href="/privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a> and <a href="/cookies" onClick={(e) => e.preventDefault()}>Cookies Policy</a>.
            </div>
            <div className="signin-footer">
              <button type="button" className="signin-back" onClick={onBack}>Cancel</button>
            </div>
          </div>
        </div>
      ) : step === 'form' && !onBack ? (
        /* Full-page /signin: fixed overlay */
        <div className="signin-form-overlay" role="dialog" aria-label={isSignIn ? 'Sign in' : 'Create account'}>
          <div className="signin-form-overlay-inner">
            <div className="signin-card" ref={formCardRef}>
              <h2 className="signin-form-title">{isSignIn ? 'Sign in' : 'Create account'}</h2>
              {message.text && (
                <div className={`signin-message signin-message--${message.type}`}>{message.text}</div>
              )}
              <form className="signin-form" onSubmit={handleEmailSubmit}>
                <label className="signin-label" htmlFor="signin-email-page">Email</label>
                <input id="signin-email-page" type="email" className="signin-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={loading} autoFocus />
                <label className="signin-label" htmlFor="signin-password-page">Password</label>
                <div className="signin-password-row">
                  <input id="signin-password-page" type={showPassword ? 'text' : 'password'} className="signin-input signin-input-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignIn ? 'current-password' : 'new-password'} disabled={loading} />
                  <button type="button" className="signin-toggle-btn" onClick={() => setShowPassword((prev) => !prev)} disabled={loading} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg className="signin-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="signin-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {isSignIn && (
                  <button type="button" className="signin-forgot-link" onClick={() => { setStep('forgot'); setMessage({ type: '', text: '' }) }} disabled={loading}>
                    Forgot password?
                  </button>
                )}
                <button type="submit" className="signin-btn signin-btn-submit" disabled={loading}>
                  {loading ? (isSignIn ? 'Signing in…' : 'Creating account…') : (isSignIn ? 'Sign In' : 'Create Account')}
                </button>
                <button type="button" className="signin-link" onClick={() => { setStep('method'); setEmail(''); setPassword(''); setMessage({ type: '', text: '' }) }} disabled={loading}>← Back</button>
              </form>
              <div className="signin-legal">
                By tapping Sign in or Create account, you agree to our <a href="/terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>. Learn how we process your data in our <a href="/privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a> and <a href="/cookies" onClick={(e) => e.preventDefault()}>Cookies Policy</a>.
              </div>
              <div className="signin-footer">
                <Link to="/" className="signin-back">Cancel</Link>
              </div>
            </div>
          </div>
        </div>
      ) : step === 'forgot' && !onBack ? (
        <div className="signin-form-overlay" role="dialog" aria-label="Reset password">
          <div className="signin-form-overlay-inner">
            <div className="signin-card" ref={formCardRef}>
              <h2 className="signin-form-title">Reset password</h2>
              <p className="signin-forgot-hint">Enter your email and we’ll send you a link to reset your password.</p>
              {message.text && (
                <div className={`signin-message signin-message--${message.type}`}>{message.text}</div>
              )}
              <form className="signin-form" onSubmit={handleForgotSubmit}>
                <label className="signin-label" htmlFor="signin-forgot-email-page">Email</label>
                <input
                  id="signin-forgot-email-page"
                  type="email"
                  className="signin-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  autoFocus
                />
                <button type="submit" className="signin-btn signin-btn-submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
                <button type="button" className="signin-link" onClick={() => { setStep('form'); setMessage({ type: '', text: '' }) }} disabled={loading}>← Back to sign in</button>
              </form>
              <div className="signin-footer">
                <Link to="/" className="signin-back">Cancel</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
