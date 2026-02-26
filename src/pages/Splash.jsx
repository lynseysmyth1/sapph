import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import SignIn from './SignIn'
import './Splash.css'

export default function Splash() {
  const { authLoading } = useAuth()
  const [intent, setIntent] = useState(null) // 'create' | 'signin'
  const [showEmailForm, setShowEmailForm] = useState(false)

  const openForm = (createOrSignIn) => {
    setIntent(createOrSignIn)
    // Defer opening sheet so tap handler returns and UI can update (reduces freeze on native)
    setTimeout(() => setShowEmailForm(true), 0)
  }

  if (authLoading) return (
    <div className="app-loading">
      <div className="app-loading-brand">
        <div className="app-loading-logo"><img src="/logos/logo-orange.png" alt="Sapph" /></div>
        <div className="app-loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  )

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
          <button
            type="button"
            className="splash-btn splash-btn-primary"
            onClick={() => openForm('create')}
            aria-label="Create account"
          >
            Create Account
          </button>
          <button
            type="button"
            className="splash-btn splash-btn-secondary"
            onClick={() => openForm('signin')}
            aria-label="Sign in"
          >
            Sign In
          </button>
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
