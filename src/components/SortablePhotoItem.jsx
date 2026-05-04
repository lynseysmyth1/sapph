import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortablePhotoItem({ id, url, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="photo-preview sortable-photo">
      <img src={url} alt={`Photo ${index + 1}`} />
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
