import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import '../Profile.css'

const FAMILY_PLANS_OPTIONS = [
  "Childfree, don't want kids",
  'Child free, dating people with children',
  'Have children',
  "Have children, don't want more",
  'Have children, open to more',
  'Want children',
  'Prefer not to say'
]

export default function FamilyPlansPreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [selectedPlans, setSelectedPlans] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.matching_preferences?.family_plans) {
      setSelectedPlans(profile.matching_preferences.family_plans || [])
    }
  }, [profile])

  const togglePlan = (plan) => {
    setSelectedPlans(prev => 
      prev.includes(plan)
        ? prev.filter(p => p !== plan)
        : [...prev, plan]
    )
  }

  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      await updateDoc(profileRef, {
        'matching_preferences.family_plans': selectedPlans,
        updated_at: new Date().toISOString()
      })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('Error saving family plans preferences:', err)
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
        <h1 className="preference-title">Family Plans</h1>
      </div>

      <div className="preference-content">
        <p className="preference-description">Select the family planning preferences you're open to matching with</p>
        
        <div className="checkbox-list">
          {FAMILY_PLANS_OPTIONS.map((plan) => (
            <label key={plan} className="checkbox-item">
              <input
                type="checkbox"
                checked={selectedPlans.includes(plan)}
                onChange={() => togglePlan(plan)}
              />
              <span className="checkbox-label">{plan}</span>
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
