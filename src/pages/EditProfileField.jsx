import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import '../pages/Profile.css'
import './EditProfileField.css'

// ── Height helpers ────────────────────────────────────────────────────────────
function parseHeight(str) {
  if (!str) return { feet: '', inches: '0' }
  const m = str.match(/^(\d+)'(\d+)"?/)
  if (m) return { feet: m[1], inches: m[2] }
  return { feet: '', inches: '0' }
}
function formatHeight(feet, inches) {
  if (!feet) return ''
  return `${feet}'${inches}"`
}

export default function EditProfileField() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, refreshProfile } = useAuth()

  const {
    fieldKey,
    label,
    type,       // 'radio' | 'checkbox' | 'text' | 'height'
    options,
    showVisibility = true,
  } = location.state || {}

  // Redirect back if arrived without state
  if (!fieldKey) {
    navigate('/edit-profile', { replace: true })
    return null
  }

  const currentValue = profile?.[fieldKey] ?? (type === 'checkbox' ? [] : '')
  const currentVisibility = profile?.visibility_settings?.[fieldKey] !== false

  const [value, setValue] = useState(currentValue)
  const [visible, setVisible] = useState(currentVisibility)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Height-specific state
  const { feet: initFeet, inches: initInches } = parseHeight(
    type === 'height' ? (currentValue || '') : ''
  )
  const [hFeet, setHFeet] = useState(initFeet)
  const [hInches, setHInches] = useState(initInches)

  const toggleOption = (opt) => {
    if (type === 'radio') {
      setValue(prev => prev === opt ? '' : opt)
    } else {
      setValue(prev => {
        const arr = Array.isArray(prev) ? prev : []
        return arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]
      })
    }
  }

  const handleSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    setError(null)
    try {
      const finalValue = type === 'height' ? formatHeight(hFeet, hInches) : value
      const profileRef = doc(db, 'profiles', user.id)
      const payload = {
        [fieldKey]: finalValue,
        updated_at: new Date().toISOString(),
      }
      if (showVisibility) {
        payload[`visibility_settings.${fieldKey}`] = visible
      }
      await setDoc(profileRef, payload, { merge: true })
      await refreshProfile()
      navigate(-1)
    } catch (err) {
      console.error('[EditProfileField] Save error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedArr = Array.isArray(value) ? value : []

  return (
    <div className="preference-page">
      <div className="preference-header">
        <button onClick={() => navigate(-1)} className="back-arrow-button" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="back-label">Back</span>
        </button>
        <h1 className="preference-title">{label}</h1>
      </div>

      <div className="preference-content">

        {/* Visibility toggle */}
        {showVisibility && (
          <label className="epf-visibility-toggle">
            <input
              type="checkbox"
              checked={visible}
              onChange={e => setVisible(e.target.checked)}
            />
            <span>Show on profile</span>
          </label>
        )}

        {/* Radio / Checkbox options */}
        {(type === 'radio' || type === 'checkbox') && options && (
          <div className="checkbox-list">
            {options.map(opt => {
              const isSelected = type === 'radio'
                ? value === opt
                : selectedArr.includes(opt)
              return (
                <label
                  key={opt}
                  className={`checkbox-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleOption(opt)}
                >
                  <input
                    type={type === 'radio' ? 'radio' : 'checkbox'}
                    checked={isSelected}
                    onChange={() => toggleOption(opt)}
                  />
                  <span className="checkbox-label">{opt}</span>
                </label>
              )
            })}
          </div>
        )}

        {/* Text input */}
        {type === 'text' && (
          <input
            className="epf-input"
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        )}

        {/* Height picker */}
        {type === 'height' && (
          <div className="epf-height-row">
            <select
              className="epf-select"
              value={hFeet}
              onChange={e => setHFeet(e.target.value)}
            >
              <option value="">ft</option>
              {['4', '5', '6', '7'].map(f => (
                <option key={f} value={f}>{f}'</option>
              ))}
            </select>
            <select
              className="epf-select"
              value={hInches}
              onChange={e => setHInches(e.target.value)}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={String(i)}>{i}"</option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="epf-error">{error}</p>}

        <button
          className="save-preference-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
