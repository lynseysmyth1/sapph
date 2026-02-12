import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import '../Profile.css'

const CONNECTION_GOALS_OPTIONS = [
  'Friends', 'Hookup', 'Life partner', 'Long term', 
  'Long term, open to short', 'Relationship', 'Short term', 
  'Short term, open to serious'
]

export default function ConnectionGoalsPreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [selectedGoals, setSelectedGoals] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.connection_goals) {
      setSelectedGoals(profile.matching_preferences.connection_goals || [])
    }
  }, [profile])

  const toggleGoal = (goal) => {
    setSelectedGoals(prev => 
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    )
  }

  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      await updateDoc(profileRef, {
        'matching_preferences.connection_goals': selectedGoals,
        updated_at: new Date().toISOString()
      })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('Error saving connection goals preferences:', err)
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
        <h1 className="preference-title">Connection Goals</h1>
      </div>

      <div className="preference-content">
        <p className="preference-description">Select the connection goals you're looking for</p>
        
        <div className="checkbox-list">
          {CONNECTION_GOALS_OPTIONS.map((goal) => (
            <label
              key={goal}
              className={`checkbox-item ${selectedGoals.includes(goal) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedGoals.includes(goal)}
                onChange={() => toggleGoal(goal)}
              />
              <span className="checkbox-label">{goal}</span>
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
