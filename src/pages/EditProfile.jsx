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

// ── Field definitions for tappable rows ──────────────────────────────────────
const FIELD_SECTIONS = [
  {
    title: 'Identity',
    fields: [
      { fieldKey: 'gender_identity', label: 'Gender identity', type: 'radio', options: ['Agender', 'Androgynous', 'Bigender', 'Gender fluid', 'Gender non conforming', 'Gender queer', 'Intersex', 'Non binary', 'Pangender', 'Trans person', 'Trans woman', 'Transfeminine', 'Transmasculine', 'Trans non-binary', 'Woman'] },
      { fieldKey: 'gender_expression', label: 'Gender expression', type: 'radio', options: ['Androgynous / Andro', 'Butch', 'Chapstick', 'Femme', 'Futch', 'Gender non conforming', 'High femme', 'Masc', 'Masc-of-centre', 'Queer femme', 'Queer masc', 'Sapphic', 'Soft butch', 'Soft Masc', 'Stem', 'Tomboy'] },
      { fieldKey: 'sexual_identity', label: 'Sexual identity', type: 'radio', options: ['Asexual', 'Bisexual', 'Demisexual', 'Gay', 'Lesbian', 'Pansexual', 'Queer', 'Questioning', 'Other'] },
      { fieldKey: 'pronouns', label: 'Pronouns', type: 'checkbox', options: ['She', 'Her', 'They', 'Them', 'He', 'Him', 'Prefer not to say', 'Other'] },
    ],
  },
  {
    title: 'About you',
    fields: [
      { fieldKey: 'height', label: 'Height', type: 'height' },
      { fieldKey: 'location', label: 'Location', type: 'text' },
      { fieldKey: 'hometown', label: 'Hometown', type: 'text' },
      { fieldKey: 'job_title', label: 'Job title', type: 'text' },
    ],
  },
  {
    title: 'Connection',
    fields: [
      { fieldKey: 'connection_goals', label: 'Connection goals', type: 'checkbox', options: ['Friends', 'Hookup', 'Life partner', 'Long term', 'Long term, open to short', 'Relationship', 'Short term', 'Short term, open to serious'], showVisibility: false },
      { fieldKey: 'relationship_style', label: 'Relationship style', type: 'checkbox', options: ['Exploring', 'Figuring it out', 'Monogamy', 'Non monogamous', 'Poly', 'Prefer not to say'] },
      { fieldKey: 'children', label: 'Family plans', type: 'radio', options: ['Childfree, not having children', 'Child free, dating people with children', 'Have children', "Have children, don't want more", 'Have children, open to more', 'Want children', 'Prefer not to say'] },
    ],
  },
  {
    title: 'Lifestyle',
    fields: [
      { fieldKey: 'smoking', label: 'Smoking', type: 'radio', options: ['No', 'Sometimes', 'Vape', 'Yes'] },
      { fieldKey: 'drinking', label: 'Drinking', type: 'radio', options: ['No', 'Sometimes', 'Yes'] },
      { fieldKey: 'marijuana', label: 'Weed', type: 'radio', options: ['No', 'Sometimes', 'Yes'] },
      { fieldKey: 'drugs', label: 'Other drugs', type: 'radio', options: ['No', 'Sometimes', 'Yes'] },
      { fieldKey: 'zodiac_sign', label: 'Zodiac sign', type: 'radio', options: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] },
      { fieldKey: 'political_alignment', label: 'Political alignment', type: 'radio', options: ['Left', 'Center', 'Right', 'Not political'] },
      { fieldKey: 'pets', label: 'Pets', type: 'checkbox', options: ['Birds', 'Cat', 'Dog', 'Fish', 'Reptile', 'Small animal', 'No pets'] },
    ],
  },
  {
    title: 'Intimate',
    fields: [
      { fieldKey: 'sex_preferences', label: 'Sex preferences', type: 'checkbox', options: ['Bottom', 'Pillow princess', 'Power bottom', 'Power top', 'Service top', 'Stone top', 'Switch', 'Top', 'Prefer not to share'] },
      { fieldKey: 'kinks', label: 'Kink preferences', type: 'checkbox', options: ['BDSM', 'Being dominant', 'Being watched', 'Being submissive', 'Bondage', 'Group dynamics', 'Role play', 'Toys', 'Watching', 'Prefer not to share'] },
    ],
  },
]

// ── Tappable field row ────────────────────────────────────────────────────────
const ChevronIcon = () => (
  <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

function ProfileFieldRow({ label, fieldKey, profile, fieldDef, onTap }) {
  const val = profile?.[fieldKey]
  const display = Array.isArray(val) && val.length > 0
    ? val.join(' · ')
    : (!Array.isArray(val) && val ? val : '—')
  return (
    <button className="matching-preference-item" onClick={onTap}>
      <span className="preference-label">{label}</span>
      <span className="ep-field-value">{display}</span>
      <ChevronIcon />
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const MIN_PHOTOS = 4
const MAX_PHOTOS = 6

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  const [bio, setBio] = useState(profile?.bio || '')
  const [conversationStarter, setConversationStarter] = useState(profile?.conversation_starter || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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

  const handleAddPhotos = (e) => {
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

  const handleReplacePhoto = (index, file) => {
    setError(null)
    const newUrl = URL.createObjectURL(file)
    setPhotos(prev => {
      const next = [...prev]
      if (next[index]?.startsWith('blob:')) URL.revokeObjectURL(next[index])
      next[index] = newUrl
      return next
    })
    compressImage(file)
      .then(compressed => {
        setPhotoFiles(prev => {
          const next = [...prev]
          next[index] = compressed
          return next
        })
      })
      .catch(() => {
        setPhotoFiles(prev => {
          const next = [...prev]
          next[index] = file
          return next
        })
      })
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

  const handleSave = async () => {
    if (photos.length < MIN_PHOTOS) {
      setError(`Please add at least ${MIN_PHOTOS} photos`)
      return
    }
    if (!bio.trim()) { setError('Please write a short bio'); return }
    if (!conversationStarter.trim()) { setError('Please add a conversation starter'); return }

    setSaving(true)
    setError(null)
    try {
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
        bio,
        conversation_starter: conversationStarter,
        photos: finalPhotos,
        updated_at: new Date().toISOString(),
      }, { merge: true })
      await refreshProfile()
      navigate('/profile')
    } catch (e) {
      console.error('[EditProfile] Save error:', e)
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const goToField = (fieldDef) => {
    navigate('/edit-profile/field', { state: { ...fieldDef, showVisibility: fieldDef.showVisibility !== false } })
  }

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

        {/* ── Name (read-only) ── */}
        <div className="matching-preferences-section">
          <h2 className="matching-preferences-heading">YOUR PROFILE</h2>
          <div className="matching-preferences-list">
            <div className="matching-preference-item ep-name-row">
              <span className="preference-label">Name</span>
              <span className="ep-field-value">{profile?.full_name || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Photos ── */}
        <div className="matching-preferences-section">
          <h2 className="matching-preferences-heading">PHOTOS</h2>
          <div className="photos-grid-card">
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
                      onReplace={handleReplacePhoto}
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
          </div>
        </div>

        {/* ── Bio ── */}
        <div className="matching-preferences-section">
          <h2 className="matching-preferences-heading">BIO</h2>
          <div className="ep-inline-field">
            <textarea
              className="ep-textarea"
              value={bio}
              placeholder="Write your bio..."
              maxLength={500}
              rows={5}
              onChange={e => setBio(e.target.value)}
            />
            <p className="ep-char-count">{bio.length}/500</p>
          </div>
        </div>

        {/* ── Icebreaker ── */}
        <div className="matching-preferences-section">
          <h2 className="matching-preferences-heading">ICEBREAKER</h2>
          <div className="ep-inline-field">
            <textarea
              className="ep-textarea"
              value={conversationStarter}
              placeholder="e.g. Ask me about my favourite hike..."
              maxLength={200}
              rows={3}
              onChange={e => setConversationStarter(e.target.value)}
            />
            <p className="ep-char-count">{conversationStarter.length}/200</p>
          </div>
        </div>

        {/* ── Tappable field sections ── */}
        {FIELD_SECTIONS.map(section => (
          <div key={section.title} className="matching-preferences-section">
            <h2 className="matching-preferences-heading">{section.title.toUpperCase()}</h2>
            <div className="matching-preferences-list">
              {section.fields.map(fieldDef => (
                <ProfileFieldRow
                  key={fieldDef.fieldKey}
                  label={fieldDef.label}
                  fieldKey={fieldDef.fieldKey}
                  profile={profile}
                  fieldDef={fieldDef}
                  onTap={() => goToField(fieldDef)}
                />
              ))}
            </div>
          </div>
        ))}

        {error && <p className="ep-error">{error}</p>}

        <div className="ep-spacer" />
      </div>

      <div className="ep-actions">
        <button className="ep-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
