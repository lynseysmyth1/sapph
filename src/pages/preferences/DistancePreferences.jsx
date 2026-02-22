import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import '../Profile.css'

export default function DistancePreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [distance, setDistance] = useState(50)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.distance) {
      setDistance(Math.max(profile.matching_preferences.distance || 50, 3))
    }
  }, [profile])

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

        <button onClick={handleSave} className="save-preference-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
