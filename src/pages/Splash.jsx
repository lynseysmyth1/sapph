import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SignIn from './SignIn'
import './Splash.css'

export default function Splash() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [showSignInOptions, setShowSignInOptions] = useState(false)
  const [signInMode, setSignInMode] = useState(true) // true = sign in, false = create account

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true })
    }
  }, [user, loading, navigate])

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
          <button
            type="button"
            className="splash-btn splash-btn-primary"
            onClick={() => {
              setSignInMode(false)
              setShowSignInOptions(true)
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            className="splash-btn splash-btn-secondary"
            onClick={() => {
              setSignInMode(true)
              setShowSignInOptions(true)
            }}
          >
            Sign In
          </button>
        </div>
      </div>

      <div
        className={`splash-signin-overlay ${showSignInOptions ? 'is-visible' : ''}`}
        onClick={() => setShowSignInOptions(false)}
        aria-hidden={!showSignInOptions}
      >
        <div className="splash-signin-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          {showSignInOptions && (
            <SignIn
              key={signInMode ? 'signin' : 'create'}
              onBack={() => setShowSignInOptions(false)}
              initialShowForm
              initialIsSignIn={signInMode}
            />
          )}
        </div>
      </div>
    </div>
  )
}
