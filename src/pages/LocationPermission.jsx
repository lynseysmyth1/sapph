import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import './LocationPermission.css'

async function markPermissionAsked(userId) {
  if (!userId) return
  try {
    await updateDoc(doc(db, 'profiles', userId), {
      location_permission_asked: true,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[LocationPermission] Failed to mark permission asked:', err?.message)
  }
}

export default function LocationPermission() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const { requestPermission, captureAndSaveCoords } = useLocation()
  const [loading, setLoading] = useState(false)

  const handleAllow = async () => {
    setLoading(true)
    try {
      const status = await requestPermission()
      if (status === 'granted') {
        await captureAndSaveCoords(user?.id)
      }
    } finally {
      await markPermissionAsked(user?.id)
      await refreshProfile()
      navigate('/home', { replace: true })
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    try {
      await markPermissionAsked(user?.id)
      await refreshProfile()
    } finally {
      navigate('/home', { replace: true })
    }
  }

  return (
    <div className="loc-perm-page">
      <div className="loc-perm-content">
        <img src="/logos/logo-orange.png" alt="Sapph" className="loc-perm-logo" />

        <div className="loc-perm-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="22" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            <path d="M24 4C15.163 4 8 11.163 8 20C8 31 24 44 24 44C24 44 40 31 40 20C40 11.163 32.837 4 24 4Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="loc-perm-heading">See who's nearby</h1>

        <p className="loc-perm-body">
          Sapph uses your location to show you matches within your chosen distance.
          We only need access <strong>while you're using the app</strong> — we never track you in the background.
        </p>

        <button
          className="loc-perm-btn-primary"
          onClick={handleAllow}
          disabled={loading}
        >
          {loading ? 'Setting up…' : 'Allow Location'}
        </button>

        <button
          className="loc-perm-btn-skip"
          onClick={handleSkip}
          disabled={loading}
        >
          Maybe Later
        </button>

        {!Capacitor.isNativePlatform() && (
          <p className="loc-perm-web-note">
            Your browser will ask for permission separately.
          </p>
        )}
      </div>
    </div>
  )
}
