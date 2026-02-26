import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../contexts/AuthContext'
import { useLocation } from '../../contexts/LocationContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import '../Profile.css'
import './DistancePreferences.css'

function openAppSettings() {
  if (Capacitor.isNativePlatform()) {
    // On Capacitor native the canonical way is the App plugin, but a simple deep-link also works
    window.open('app-settings:', '_system')
  }
}

export default function DistancePreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const { permissionStatus, requestPermission, captureAndSaveCoords, checkPermission } = useLocation()
  const navigate = useNavigate()
  const [distance, setDistance] = useState(50)
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.distance) {
      setDistance(Math.max(profile.matching_preferences.distance || 50, 3))
    }
  }, [profile])

  // Re-check permission each time this page mounts (user may have changed it in Settings)
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      await updateDoc(profileRef, {
        'matching_preferences.distance': distance,
        updated_at: new Date().toISOString()
      })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('Error saving distance preferences:', err)
      alert('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEnableLocation = async () => {
    setRequesting(true)
    try {
      const status = await requestPermission()
      if (status === 'granted') {
        await captureAndSaveCoords(user?.id)
      }
    } finally {
      setRequesting(false)
    }
  }

  const renderPermissionGate = () => {
    if (permissionStatus === 'denied') {
      return (
        <div className="dist-perm-gate">
          <div className="dist-perm-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <h3 className="dist-perm-title">Location access required</h3>
          <p className="dist-perm-body">
            Location access has been denied. To use the distance filter, please enable it in your device settings.
          </p>
          {Capacitor.isNativePlatform() && (
            <button className="dist-perm-btn" onClick={openAppSettings}>
              Open Settings
            </button>
          )}
          {!Capacitor.isNativePlatform() && (
            <p className="dist-perm-web-hint">
              Enable location in your browser's site settings, then reload the page.
            </p>
          )}
        </div>
      )
    }

    if (permissionStatus === 'prompt' || permissionStatus === 'unknown') {
      return (
        <div className="dist-perm-gate">
          <div className="dist-perm-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <h3 className="dist-perm-title">Enable location to use this filter</h3>
          <p className="dist-perm-body">
            Sapph needs your location to filter matches by distance.
            We only use it while the app is open.
          </p>
          <button
            className="dist-perm-btn"
            onClick={handleEnableLocation}
            disabled={requesting}
          >
            {requesting ? 'Requesting…' : 'Enable Location'}
          </button>
        </div>
      )
    }

    return null
  }

  const isGranted = permissionStatus === 'granted'

  return (
    <div className="preference-page">
      <div className="preference-header">
        <button onClick={() => navigate('/profile')} className="back-arrow-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"></path>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span className="back-label">Back</span>
        </button>
        <h1 className="preference-title">Distance</h1>
      </div>

      <div className="preference-content">
        {!isGranted && renderPermissionGate()}

        {isGranted && (
          <div className="distance-container">
            <div className="distance-display">
              <span className="distance-value">{distance}</span>
              <span className="distance-unit">miles</span>
            </div>

            <div className="slider-container">
              <label className="slider-label">Maximum Distance: {distance} miles</label>
              <input
                type="range"
                min="3"
                max="100"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                className="distance-slider"
              />
              <div className="slider-labels">
                <span>3 miles</span>
                <span>100 miles</span>
              </div>
            </div>
          </div>
        )}

        {isGranted && (
          <button onClick={handleSave} className="save-preference-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
