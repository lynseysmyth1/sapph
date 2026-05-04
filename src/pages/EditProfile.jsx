import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import SortablePhotoItem from '../components/SortablePhotoItem'
import { compressImage, uploadPhotos } from '../lib/photoHelpers'
import './EditProfile.css'

// ── Field option lists (mirrored from ONBOARDING_STEPS) ──────────────────────
const PRONOUNS_OPTIONS = ['She', 'Her', 'They', 'Them', 'He', 'Him', 'Prefer not to say', 'Other']
const GENDER_IDENTITY_OPTIONS = ['Agender', 'Androgynous', 'Bigender', 'Gender fluid', 'Gender non conforming', 'Gender queer', 'Intersex', 'Non binary', 'Pangender', 'Trans person', 'Trans woman', 'Transfeminine', 'Transmasculine', 'Trans non-binary', 'Woman']
const GENDER_EXPRESSION_OPTIONS = ['Androgynous / Andro', 'Butch', 'Chapstick', 'Femme', 'Futch', 'Gender non conforming', 'High femme', 'Masc', 'Masc-of-centre', 'Queer femme', 'Queer masc', 'Sapphic', 'Soft butch', 'Soft Masc', 'Stem', 'Tomboy']
const SEXUAL_IDENTITY_OPTIONS = ['Asexual', 'Bisexual', 'Demisexual', 'Gay', 'Lesbian', 'Pansexual', 'Queer', 'Questioning', 'Other']
const CHILDREN_OPTIONS = ['Childfree, not having children', 'Child free, dating people with children', 'Have children', "Have children, don't want more", 'Have children, open to more', 'Want children', 'Prefer not to say']
const POLITICAL_OPTIONS = ['Left', 'Center', 'Right', 'Not political']
const SMOKING_OPTIONS = ['No', 'Sometimes', 'Vape', 'Yes']
const DRINKING_OPTIONS = ['No', 'Sometimes', 'Yes']
const MARIJUANA_OPTIONS = ['No', 'Sometimes', 'Yes']
const DRUGS_OPTIONS = ['No', 'Sometimes', 'Yes']
const PETS_OPTIONS = ['Birds', 'Cat', 'Dog', 'Fish', 'Reptile', 'Small animal', 'No pets']
const ZODIAC_OPTIONS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
const CONNECTION_GOALS_OPTIONS = ['Friends', 'Hookup', 'Life partner', 'Long term', 'Long term, open to short', 'Relationship', 'Short term', 'Short term, open to serious']
const RELATIONSHIP_STYLE_OPTIONS = ['Exploring', 'Figuring it out', 'Monogamy', 'Non monogamous', 'Poly', 'Prefer not to say']
const SEX_PREFERENCES_OPTIONS = ['Bottom', 'Pillow princess', 'Power bottom', 'Power top', 'Service top', 'Stone top', 'Switch', 'Top', 'Prefer not to share']
const KINKS_OPTIONS = ['BDSM', 'Being dominant', 'Being watched', 'Being submissive', 'Bondage', 'Group dynamics', 'Role play', 'Toys', 'Watching', 'Prefer not to share']

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

// ── Reusable sub-components ───────────────────────────────────────────────────
function SectionHeader({ title }) {
  return <h2 className="ep-section-header">{title}</h2>
}

function FieldRow({ label, fieldKey, visibilityData, onVisibilityChange, alwaysVisible, children }) {
  return (
    <div className="ep-field-row">
      <div className="ep-field-label-row">
        <label className="ep-field-label">{label}</label>
        {!alwaysVisible && (
          <label className="ep-visibility-toggle">
            <input
              type="checkbox"
              checked={visibilityData[fieldKey] !== false}
              onChange={e => onVisibilityChange(fieldKey, e.target.checked)}
            />
            <span className="ep-visibility-label">Show on profile</span>
          </label>
        )}
        {alwaysVisible && <span className="ep-always-visible">Always visible</span>}
      </div>
      {children}
    </div>
  )
}

function RadioGroup({ fieldKey, options, value, onChange }) {
  return (
    <div className="ep-chip-group">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className={`ep-chip ${value === opt ? 'selected' : ''}`}
          onClick={() => onChange(fieldKey, value === opt ? null : opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function CheckboxGroup({ fieldKey, options, values, onChange }) {
  const arr = values || []
  const toggle = (opt) => {
    const next = arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]
    onChange(fieldKey, next)
  }
  return (
    <div className="ep-chip-group">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className={`ep-chip ${arr.includes(opt) ? 'selected' : ''}`}
          onClick={() => toggle(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const MIN_PHOTOS = 4
const MAX_PHOTOS = 6

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  const [formData, setFormData] = useState(() => {
    const { id, onboarding_completed, updated_at, photos, visibility_settings, ...rest } = profile || {}
    return { ...rest }
  })
  const [visibilityData, setVisibilityData] = useState(() => profile?.visibility_settings || {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedOk, setSavedOk] = useState(false)

  // ── Photo state ──────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState(() =>
    (profile?.photos || []).filter(url => url.startsWith('http'))
  )
  const [photoFiles, setPhotoFiles] = useState([])

  const photoSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = photos.indexOf(active.id)
    const newIndex = photos.indexOf(over.id)
    if (oldIndex === -1 || newIndex === -1) return
    setPhotos(prev => arrayMove(prev, oldIndex, newIndex))
    setPhotoFiles(prev => arrayMove(prev, oldIndex, newIndex))
  }

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length + photos.length > MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed`)
      return
    }
    setError(null)
    const urls = files.map(f => URL.createObjectURL(f))
    setPhotos(prev => [...prev, ...urls])
    Promise.all(files.map(f => compressImage(f)))
      .then(compressed => setPhotoFiles(prev => [...prev, ...compressed]))
      .catch(() => setPhotoFiles(prev => [...prev, ...files]))
    e.target.value = ''
  }

  const handleRemovePhoto = (index) => {
    if (photos.length <= MIN_PHOTOS) {
      setError(`You need at least ${MIN_PHOTOS} photos`)
      return
    }
    setError(null)
    const newPhotos = [...photos]
    const newFiles = [...photoFiles]
    if (newPhotos[index]?.startsWith('blob:')) URL.revokeObjectURL(newPhotos[index])
    newPhotos.splice(index, 1)
    newFiles.splice(index, 1)
    setPhotos(newPhotos)
    setPhotoFiles(newFiles)
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const set = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    setSavedOk(false)
  }
  const setVisibility = (key, checked) => {
    setVisibilityData(prev => ({ ...prev, [key]: checked }))
    setSavedOk(false)
  }

  // Height state derived from formData.height
  const { feet: hFeet, inches: hInches } = parseHeight(formData.height)
  const setHeight = (feet, inches) => set('height', formatHeight(feet, inches))

  const validate = () => {
    if (photos.length < MIN_PHOTOS) return `Please add at least ${MIN_PHOTOS} photos`
    if (!formData.bio?.trim()) return 'Please write a short bio'
    if (!formData.conversation_starter?.trim()) return 'Please add a conversation starter'
    if (!Array.isArray(formData.connection_goals) || formData.connection_goals.length === 0) return 'Please select at least one connection goal'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError(null)
    try {
      // Resolve any new blob photos to Firebase Storage URLs first
      const existingUrls = photos.filter(url => url.startsWith('http'))
      const blobUrls = photos.filter(url => url.startsWith('blob:'))
      let finalPhotos = existingUrls
      if (blobUrls.length > 0) {
        const blobFiles = photoFiles.slice(existingUrls.length)
        const uploadedUrls = await uploadPhotos(blobUrls, blobFiles, user.id)
        let uploadIdx = 0
        finalPhotos = photos
          .map(url => url.startsWith('blob:') ? uploadedUrls[uploadIdx++] || url : url)
          .filter(url => url.startsWith('http'))
      }

      const profileRef = doc(db, 'profiles', user.id)
      await setDoc(profileRef, {
        ...formData,
        photos: finalPhotos,
        visibility_settings: visibilityData,
        updated_at: new Date().toISOString(),
      }, { merge: true })
      await refreshProfile()
      setSavedOk(true)
      navigate('/profile')
    } catch (e) {
      console.error('[EditProfile] Save error:', e)
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const vp = { visibilityData, onVisibilityChange: setVisibility }

  return (
    <div className="ep-container">
      <div className="preview-profile-header">
        <button className="back-arrow-button" onClick={() => navigate('/profile')} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="back-label">Back</span>
        </button>
      </div>

      <div className="ep-scroll">

        {/* ── Name ── */}
        <SectionHeader title="Your profile" />

        <FieldRow label="Name" fieldKey="full_name" {...vp} alwaysVisible>
          <p className="ep-readonly-value">{formData.full_name || '—'}</p>
          <p className="ep-field-hint">Name cannot be changed after sign-up</p>
        </FieldRow>

        {/* ── Photos ── */}
        <SectionHeader title="Photos" />
        <p className="ep-field-hint ep-photos-hint">
          Drag to reorder · {photos.length}/{MAX_PHOTOS} photos · minimum {MIN_PHOTOS} required
        </p>
        <DndContext sensors={photoSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos} strategy={rectSortingStrategy}>
            <div className="photos-grid">
              {photos.map((url, index) => (
                <SortablePhotoItem
                  key={url}
                  id={url}
                  url={url}
                  index={index}
                  onRemove={handleRemovePhoto}
                />
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="photo-add-btn" aria-label="Add photo">
                  <span>+</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddPhotos}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </SortableContext>
        </DndContext>

        <FieldRow label="Bio" fieldKey="bio" {...vp} alwaysVisible>
          <textarea
            className="ep-textarea"
            value={formData.bio || ''}
            placeholder="Write your bio..."
            maxLength={500}
            rows={5}
            onChange={e => set('bio', e.target.value)}
          />
          <p className="ep-char-count">{(formData.bio || '').length}/500</p>
        </FieldRow>

        <FieldRow label="Conversation starter" fieldKey="conversation_starter" {...vp} alwaysVisible>
          <textarea
            className="ep-textarea"
            value={formData.conversation_starter || ''}
            placeholder="e.g. Ask me about my favourite hike..."
            maxLength={200}
            rows={3}
            onChange={e => set('conversation_starter', e.target.value)}
          />
          <p className="ep-char-count">{(formData.conversation_starter || '').length}/200</p>
        </FieldRow>

        {/* ── Identity ── */}
        <SectionHeader title="Identity" />

        <FieldRow label="Gender identity" fieldKey="gender_identity" {...vp}>
          <RadioGroup fieldKey="gender_identity" options={GENDER_IDENTITY_OPTIONS} value={formData.gender_identity} onChange={set} />
        </FieldRow>

        <FieldRow label="Gender expression" fieldKey="gender_expression" {...vp}>
          <RadioGroup fieldKey="gender_expression" options={GENDER_EXPRESSION_OPTIONS} value={formData.gender_expression} onChange={set} />
        </FieldRow>

        <FieldRow label="Sexual identity" fieldKey="sexual_identity" {...vp}>
          <RadioGroup fieldKey="sexual_identity" options={SEXUAL_IDENTITY_OPTIONS} value={formData.sexual_identity} onChange={set} />
        </FieldRow>

        <FieldRow label="Pronouns" fieldKey="pronouns" {...vp}>
          <CheckboxGroup fieldKey="pronouns" options={PRONOUNS_OPTIONS} values={formData.pronouns} onChange={set} />
        </FieldRow>

        {/* ── About you ── */}
        <SectionHeader title="About you" />

        <FieldRow label="Height" fieldKey="height" {...vp}>
          <div className="ep-height-row">
            <select
              className="ep-select"
              value={hFeet}
              onChange={e => setHeight(e.target.value, hInches)}
            >
              <option value="">ft</option>
              {['4','5','6','7'].map(f => <option key={f} value={f}>{f}'</option>)}
            </select>
            <select
              className="ep-select"
              value={hInches}
              onChange={e => setHeight(hFeet, e.target.value)}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={String(i)}>{i}"</option>
              ))}
            </select>
          </div>
        </FieldRow>

        <FieldRow label="Location" fieldKey="location" {...vp}>
          <input
            className="ep-input"
            type="text"
            value={formData.location || ''}
            placeholder="City and area"
            onChange={e => set('location', e.target.value)}
          />
        </FieldRow>

        <FieldRow label="Hometown" fieldKey="hometown" {...vp}>
          <input
            className="ep-input"
            type="text"
            value={formData.hometown || ''}
            placeholder="Country or city"
            onChange={e => set('hometown', e.target.value)}
          />
        </FieldRow>

        <FieldRow label="Job title" fieldKey="job_title" {...vp}>
          <input
            className="ep-input"
            type="text"
            value={formData.job_title || ''}
            placeholder="What do you do?"
            onChange={e => set('job_title', e.target.value)}
          />
        </FieldRow>

        {/* ── Connection ── */}
        <SectionHeader title="Connection" />

        <FieldRow label="Connection goals" fieldKey="connection_goals" {...vp} alwaysVisible>
          <CheckboxGroup fieldKey="connection_goals" options={CONNECTION_GOALS_OPTIONS} values={formData.connection_goals} onChange={set} />
        </FieldRow>

        <FieldRow label="Relationship style" fieldKey="relationship_style" {...vp}>
          <CheckboxGroup fieldKey="relationship_style" options={RELATIONSHIP_STYLE_OPTIONS} values={formData.relationship_style} onChange={set} />
        </FieldRow>

        <FieldRow label="Family plans" fieldKey="children" {...vp}>
          <RadioGroup fieldKey="children" options={CHILDREN_OPTIONS} value={formData.children} onChange={set} />
        </FieldRow>

        {/* ── More about you ── */}
        <SectionHeader title="More about you" />

        <FieldRow label="Zodiac sign" fieldKey="zodiac_sign" {...vp}>
          <RadioGroup fieldKey="zodiac_sign" options={ZODIAC_OPTIONS} value={formData.zodiac_sign} onChange={set} />
        </FieldRow>

        <FieldRow label="Political alignment" fieldKey="political_alignment" {...vp}>
          <RadioGroup fieldKey="political_alignment" options={POLITICAL_OPTIONS} value={formData.political_alignment} onChange={set} />
        </FieldRow>

        <FieldRow label="Pets" fieldKey="pets" {...vp}>
          <CheckboxGroup fieldKey="pets" options={PETS_OPTIONS} values={formData.pets} onChange={set} />
        </FieldRow>

        {/* ── Lifestyle ── */}
        <SectionHeader title="Lifestyle" />

        <FieldRow label="Smoking" fieldKey="smoking" {...vp}>
          <RadioGroup fieldKey="smoking" options={SMOKING_OPTIONS} value={formData.smoking} onChange={set} />
        </FieldRow>

        <FieldRow label="Drinking" fieldKey="drinking" {...vp}>
          <RadioGroup fieldKey="drinking" options={DRINKING_OPTIONS} value={formData.drinking} onChange={set} />
        </FieldRow>

        <FieldRow label="Weed" fieldKey="marijuana" {...vp}>
          <RadioGroup fieldKey="marijuana" options={MARIJUANA_OPTIONS} value={formData.marijuana} onChange={set} />
        </FieldRow>

        <FieldRow label="Other drugs" fieldKey="drugs" {...vp}>
          <RadioGroup fieldKey="drugs" options={DRUGS_OPTIONS} value={formData.drugs} onChange={set} />
        </FieldRow>

        {/* ── Intimate ── */}
        <SectionHeader title="Intimate" />

        <FieldRow label="Sex preferences" fieldKey="sex_preferences" {...vp}>
          <CheckboxGroup fieldKey="sex_preferences" options={SEX_PREFERENCES_OPTIONS} values={formData.sex_preferences} onChange={set} />
        </FieldRow>

        <FieldRow label="Kink preferences" fieldKey="kinks" {...vp}>
          <CheckboxGroup fieldKey="kinks" options={KINKS_OPTIONS} values={formData.kinks} onChange={set} />
        </FieldRow>

        {error && <p className="ep-error">{error}</p>}
        {savedOk && <p className="ep-saved">Profile saved!</p>}

        <div className="ep-spacer" />
      </div>

      <div className="ep-actions">
        <button className="ep-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
