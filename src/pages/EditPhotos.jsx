import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import SortablePhotoItem from '../components/SortablePhotoItem'
import { compressImage, uploadPhotos } from '../lib/photoHelpers'
import './EditPhotos.css'

const MIN_PHOTOS = 4
const MAX_PHOTOS = 6

export default function EditPhotos() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  const existingPhotos = (profile?.photos || []).filter(url => url.startsWith('http'))
  const [photos, setPhotos] = useState(existingPhotos)
  const [photoFiles, setPhotoFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const sensors = useSensors(
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
      .then(compressed => {
        setPhotoFiles(prev => [...prev, ...compressed])
      })
      .catch(err => {
        console.error('[EditPhotos] Compression error:', err)
        setPhotoFiles(prev => [...prev, ...files])
      })

    e.target.value = ''
  }

  const handleRemove = (index) => {
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
    setSaving(true)
    setError(null)
    try {
      const existingUrls = photos.filter(url => url.startsWith('http'))
      const blobUrls = photos.filter(url => url.startsWith('blob:'))

      let finalUrls = existingUrls
      if (blobUrls.length > 0) {
        const blobFiles = photoFiles.slice(existingUrls.length)
        const uploadedUrls = await uploadPhotos(blobUrls, blobFiles, user.id)
        // Rebuild in original order: replace blob entries with their upload URLs
        let uploadIdx = 0
        finalUrls = photos.map(url => {
          if (url.startsWith('blob:')) return uploadedUrls[uploadIdx++] || url
          return url
        }).filter(url => url.startsWith('http'))
      }

      const profileRef = doc(db, 'profiles', user.id)
      await setDoc(profileRef, { photos: finalUrls, updated_at: new Date().toISOString() }, { merge: true })
      await refreshProfile()
      navigate('/profile')
    } catch (err) {
      console.error('[EditPhotos] Save error:', err)
      setError('Something went wrong saving your photos. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const canSave = photos.length >= MIN_PHOTOS && !saving

  return (
    <div className="edit-photos-container">
      <header className="edit-photos-header">
        <button className="back-arrow-button" onClick={() => navigate('/profile')} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="back-label">Back</span>
        </button>
        <h1 className="edit-photos-title">Edit Photos</h1>
      </header>

      <div className="edit-photos-scroll">
        <p className="edit-photos-hint">
          Drag to reorder · {photos.length}/{MAX_PHOTOS} photos · minimum {MIN_PHOTOS} required
        </p>

        {error && <p className="edit-photos-error">{error}</p>}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos} strategy={rectSortingStrategy}>
            <div className="photos-grid">
              {photos.map((url, index) => (
                <SortablePhotoItem
                  key={url}
                  id={url}
                  url={url}
                  index={index}
                  onRemove={handleRemove}
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

        <div className="edit-photos-spacer" />
      </div>

      <div className="edit-photos-actions">
        <button
          className="edit-photos-save-btn"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? 'Saving…' : 'Save Photos'}
        </button>
        {photos.length < MIN_PHOTOS && (
          <p className="edit-photos-min-hint">Add {MIN_PHOTOS - photos.length} more photo{MIN_PHOTOS - photos.length !== 1 ? 's' : ''} to save</p>
        )}
      </div>
    </div>
  )
}
