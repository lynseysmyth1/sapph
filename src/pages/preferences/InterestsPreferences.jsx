import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import '../Profile.css'

// Common interests - can be expanded
const INTERESTS_OPTIONS = [
  'Art', 'Books', 'Cooking', 'Dancing', 'Fitness', 'Gaming', 
  'Hiking', 'Music', 'Movies', 'Photography', 'Sports', 'Travel',
  'Yoga', 'Writing', 'Volunteering', 'Fashion', 'Food', 'Nature'
]

export default function InterestsPreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [selectedInterests, setSelectedInterests] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.interests) {
      setSelectedInterests(profile.matching_preferences.interests || [])
    }
  }, [profile])

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    )
  }

  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      await updateDoc(profileRef, {
        'matching_preferences.interests': selectedInterests,
        updated_at: new Date().toISOString()
      })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('Error saving interests preferences:', err)
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
        <h1 className="preference-title">Interests</h1>
      </div>

      <div className="preference-content">
        <p className="preference-description">Select interests you'd like to match with</p>
        
        <div className="checkbox-list">
          {INTERESTS_OPTIONS.map((interest) => (
            <label key={interest} className="checkbox-item">
              <input
                type="checkbox"
                checked={selectedInterests.includes(interest)}
                onChange={() => toggleInterest(interest)}
              />
              <span className="checkbox-label">{interest}</span>
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
