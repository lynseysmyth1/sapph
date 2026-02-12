import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import '../Profile.css'

const GENDER_OPTIONS = [
  'Agender', 'Androgynous', 'Bigender', 'Gender fluid', 
  'Gender non conforming', 'Gender queer', 'Intersex', 'Non binary', 
  'Pangender', 'Trans person', 'Trans woman', 'Transfeminine', 
  'Transmasculine', 'Trans non-binary', 'Woman'
]

export default function GenderPreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [selectedGenders, setSelectedGenders] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.gender) {
      setSelectedGenders(profile.matching_preferences.gender || [])
    }
  }, [profile])

  const toggleGender = (gender) => {
    setSelectedGenders(prev => 
      prev.includes(gender)
        ? prev.filter(g => g !== gender)
        : [...prev, gender]
    )
  }

  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      await updateDoc(profileRef, {
        'matching_preferences.gender': selectedGenders,
        updated_at: new Date().toISOString()
      })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('Error saving gender preferences:', err)
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
        <h1 className="preference-title">Gender</h1>
      </div>

      <div className="preference-content">
        <p className="preference-description">Select the genders you're interested in matching with</p>
        
        <div className="checkbox-list">
          {GENDER_OPTIONS.map((gender) => (
            <label
              key={gender}
              className={`checkbox-item ${selectedGenders.includes(gender) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedGenders.includes(gender)}
                onChange={() => toggleGender(gender)}
              />
              <span className="checkbox-label">{gender}</span>
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
