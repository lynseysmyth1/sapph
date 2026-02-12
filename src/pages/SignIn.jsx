import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../lib/firebase'
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

export default function SignIn({ onBack, initialShowForm = false, initialIsSignIn = true }) {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showForm, setShowForm] = useState(initialShowForm)
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

  const handleButtonClick = (signInMode) => {
    setIsSignIn(signInMode)
    setShowForm(true)
  }

  // Use pointer + click so taps work on iOS and desktop; guard avoids double fire
  const onChooseCreateAccount = (e) => {
    if (choosingRef.current) return
    choosingRef.current = true
    setTimeout(() => { choosingRef.current = false }, 400)
    e.preventDefault()
    e.stopPropagation()
    handleButtonClick(false)
  }
  const onChooseSignIn = (e) => {
    if (choosingRef.current) return
    choosingRef.current = true
    setTimeout(() => { choosingRef.current = false }, 400)
    e.preventDefault()
    e.stopPropagation()
    handleButtonClick(true)
  }

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
    try {
      if (isSignIn) {
        await signInWithEmailAndPassword(auth, email.trim(), password.trim())
        if (onBack) onBack()
        if (Capacitor.isNativePlatform()) {
          window.location.hash = '#/home'
          setTimeout(() => window.location.reload(), 100)
        }
        return
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password.trim())
        showMessage('success', 'Account created! Signing you in...')
        if (onBack) onBack()
        if (Capacitor.isNativePlatform()) {
          window.location.hash = '#/home'
          setTimeout(() => window.location.reload(), 100)
        }
        return
      }
    } catch (err) {
      const msg = err.message || ''
      console.error('Auth error:', err)
      if (err.code === 'auth/too-many-requests') {
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
      
      {!showForm ? (
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
      ) : onBack ? (
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
              <input
                id="signin-password"
                type="password"
                className="signin-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                disabled={loading}
              />
              <button type="submit" className="signin-btn signin-btn-submit" disabled={loading}>
                {loading ? (isSignIn ? 'Signing in…' : 'Creating account…') : (isSignIn ? 'Sign In' : 'Create Account')}
              </button>
              <button
                type="button"
                className="signin-link"
                onClick={() => {
                  if (onBack) {
                    onBack()
                  } else {
                    setShowForm(false)
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
              <Link to="/test-firebase" className="signin-test-link">Test Firebase connection</Link>
            </div>
          </div>
        </div>
      ) : (
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
                <input id="signin-password-page" type="password" className="signin-input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignIn ? 'current-password' : 'new-password'} disabled={loading} />
                <button type="submit" className="signin-btn signin-btn-submit" disabled={loading}>
                  {loading ? (isSignIn ? 'Signing in…' : 'Creating account…') : (isSignIn ? 'Sign In' : 'Create Account')}
                </button>
                <button type="button" className="signin-link" onClick={() => { setShowForm(false); setEmail(''); setPassword(''); setMessage({ type: '', text: '' }) }} disabled={loading}>← Back</button>
              </form>
              <div className="signin-legal">
                By tapping Sign in or Create account, you agree to our <a href="/terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>. Learn how we process your data in our <a href="/privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a> and <a href="/cookies" onClick={(e) => e.preventDefault()}>Cookies Policy</a>.
              </div>
              <div className="signin-footer">
                <Link to="/" className="signin-back">Cancel</Link>
                <Link to="/test-firebase" className="signin-test-link">Test Firebase connection</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
