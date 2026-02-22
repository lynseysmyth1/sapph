import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import '../Profile.css'

const SEX_PREFERENCE_OPTIONS = [
  'Bottom', 'Pillow princess', 'Power bottom', 'Power top',
  'Service top', 'Stone top', 'Switch', 'Top'
]

export default function SexPreferencePreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [selectedOptions, setSelectedOptions] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.sex_preferences) {
      setSelectedOptions(profile.matching_preferences.sex_preferences || [])
    }
  }, [profile])

  const toggleOption = (option) => {
    setSelectedOptions(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    )
  }

  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      await updateDoc(profileRef, {
        'matching_preferences.sex_preferences': selectedOptions,
        updated_at: new Date().toISOString()
      })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('Error saving sex preference preferences:', err)
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
        <h1 className="preference-title">Sex Preference</h1>
      </div>

      <div className="preference-content">
        <p className="preference-description">Select the sex preferences you're interested in matching with</p>

        <div className="checkbox-list">
          {SEX_PREFERENCE_OPTIONS.map((option) => (
            <label
              key={option}
              className={`checkbox-item ${selectedOptions.includes(option) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedOptions.includes(option)}
                onChange={() => toggleOption(option)}
              />
              <span className="checkbox-label">{option}</span>
            </label>
          ))}
        </div>

        <button onClick={handleSave} className="save-preference-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
