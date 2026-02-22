import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import '../Profile.css'

export default function AgeRangePreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [ageRange, setAgeRange] = useState([18, 99])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.age_range) {
      const savedMin = profile.matching_preferences.age_range.min || 18
      const savedMax = profile.matching_preferences.age_range.max || 99
      setAgeRange([savedMin, Math.max(savedMax, savedMin + 5)])
    }
  }, [profile])


  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      const safeMin = ageRange[0]
      const safeMax = Math.max(ageRange[1], safeMin + 5)
      await updateDoc(profileRef, {
        'matching_preferences.age_range': {
          min: safeMin,
          max: safeMax
        },
        updated_at: new Date().toISOString()
      })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('Error saving age range preferences:', err)
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
        <h1 className="preference-title">Age Range</h1>
      </div>

      <div className="preference-content">
        <div className="age-range-container">
          <div className="age-display">
            <div className="age-value">
              <span className="age-label">Min Age</span>
              <span className="age-number">{ageRange[0]}</span>
            </div>
            <div className="age-value">
              <span className="age-label">Max Age</span>
              <span className="age-number">{ageRange[1]}</span>
            </div>
          </div>

          <div className="dual-slider-container">
            <Slider
              range
              value={ageRange}
              onChange={setAgeRange}
              min={18}
              max={99}
              step={1}
              pushable={5}
              className="rc-slider-custom"
            />
          </div>
        </div>

        <button onClick={handleSave} className="save-preference-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
