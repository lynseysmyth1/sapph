import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import '../Profile.css'

const RELATIONSHIP_STYLE_OPTIONS = [
  'Exploring', 'Figuring it out', 'Monogamy', 
  'Non monogamous', 'Poly'
]

export default function RelationshipStylePreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [selectedStyles, setSelectedStyles] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.relationship_style) {
      setSelectedStyles(profile.matching_preferences.relationship_style || [])
    }
  }, [profile])

  const toggleStyle = (style) => {
    setSelectedStyles(prev => 
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    )
  }

  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      await updateDoc(profileRef, {
        'matching_preferences.relationship_style': selectedStyles,
        updated_at: new Date().toISOString()
      })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('Error saving relationship style preferences:', err)
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
        <h1 className="preference-title">Relationship Style</h1>
      </div>

      <div className="preference-content">
        <p className="preference-description">Select the relationship styles you're open to</p>
        
        <div className="checkbox-list">
          {RELATIONSHIP_STYLE_OPTIONS.map((style) => (
            <label
              key={style}
              className={`checkbox-item ${selectedStyles.includes(style) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedStyles.includes(style)}
                onChange={() => toggleStyle(style)}
              />
              <span className="checkbox-label">{style}</span>
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
