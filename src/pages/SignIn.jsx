import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../lib/firebase'
import './SignIn.css'

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
  const [message, setMessage] = useState({ type: '', text: '' })
  const formCardRef = useRef(null)
  const choosingRef = useRef(false)

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
    setStep('form')
    setMessage({ type: '', text: '' })
  }

  const goToChoice = () => {
    setStep('choice')
    setMessage({ type: '', text: '' })
  }

  const handleButtonClick = (signInMode) => {
    setIsSignIn(signInMode)
    setStep('form')
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
  const NATIVE_AUTH_TIMEOUT_MS = 30000 // Longer timeout for native (30 seconds)

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
    const isNative = Capacitor.isNativePlatform()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('auth_timeout')), EMAIL_AUTH_TIMEOUT_MS)
    )
    const nativeTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('auth_timeout_native')), NATIVE_AUTH_TIMEOUT_MS)
    )
    
    console.log('[SignIn] Starting auth, isNative:', isNative, 'origin:', window.location.origin)
    
    try {
      if (isSignIn) {
        const authPromise = signInWithEmailAndPassword(auth, email.trim(), password.trim())
        // On native, use longer timeout (30s); on web, use shorter timeout (15s)
        const resultPromise = isNative 
          ? Promise.race([authPromise, nativeTimeoutPromise])
          : Promise.race([authPromise, timeoutPromise])
        await resultPromise
        console.log('[SignIn] ✅ Sign in successful')
        if (onBack) onBack()
        // Navigate immediately - no page reload
        navigate('/home', { replace: true })
        // On native, let React Router handle navigation; no hash change or reload
        return
      } else {
        // Create account: use Firebase Auth directly
        console.log('[SignIn] Starting account creation for:', email.trim())
        console.log('[SignIn] Is native platform:', isNative)
        console.log('[SignIn] Auth origin:', window.location.origin)
        
        const authPromise = createUserWithEmailAndPassword(auth, email.trim(), password.trim())
        
        // Add a longer timeout even on native (30 seconds) to catch real failures
        const nativeTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('auth_timeout_native')), 30000)
        )
        
        // On native, use longer timeout; on web, use shorter timeout
        const resultPromise = isNative 
          ? Promise.race([authPromise, nativeTimeoutPromise])
          : Promise.race([authPromise, timeoutPromise])
        
        try {
          await resultPromise
          console.log('[SignIn] ✅ Account created successfully')
          if (onBack) onBack()
          // Navigate to / — SplashOrRedirect will route to /onboarding once profile loads
          navigate('/', { replace: true })
          return
        } catch (authErr) {
          // Re-throw to be caught by outer catch block
          throw authErr
        }
      }
    } catch (err) {
      const msg = err.message || ''
      const code = err.code || ''
      console.error('[SignIn] ❌ Auth error:', err)
      console.error('[SignIn] ❌ Error code:', code)
      console.error('[SignIn] ❌ Error message:', msg)
      console.error('[SignIn] ❌ Full error:', JSON.stringify(err, null, 2))
      
      if (code === 'auth/email-already-in-use') {
        showMessage('error', 'An account with this email already exists. Please sign in instead.')
      } else if (err?.message === 'auth_timeout' || err?.message === 'auth_timeout_native') {
        const timeoutHint = !isSignIn
          ? ' The app may be loading from an unauthorized origin. Try restoring server.url in capacitor.config.json to load from Firebase Hosting (https://sapph-b4f8e.web.app).'
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
              disabled={loading}
              aria-label="Create Account"
            >
              Create Account
            </button>
            <button
              type="button"
              className="signin-btn signin-btn-secondary"
              onPointerUp={onChooseSignIn}
              onClick={onChooseSignIn}
              disabled={loading}
              aria-label="Sign In"
            >
              Sign In
            </button>
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
                    setStep('choice')
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
                <button type="button" className="signin-link" onClick={() => { setStep('choice'); setEmail(''); setPassword(''); setMessage({ type: '', text: '' }) }} disabled={loading}>← Back</button>
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
