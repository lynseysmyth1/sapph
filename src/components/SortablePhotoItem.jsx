import { useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortablePhotoItem({ id, url, index, onRemove, onReplace }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const fileInputRef = useRef(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  const handleImageClick = (e) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onReplace) onReplace(index, file)
    e.target.value = ''
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="photo-preview sortable-photo">
      <img
        src={url}
        alt={`Photo ${index + 1}`}
        onPointerDown={e => e.stopPropagation()}
        onClick={handleImageClick}
        style={{ cursor: 'pointer' }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        onPointerDown={e => e.stopPropagation()}
      />
      <button
        type="button"
        className="remove-photo"
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onRemove(index)}
        aria-label="Remove photo"
      >&times;</button>
    </div>
  )
}
