import { useState } from 'react'
import { Link } from 'react-router-dom'
import MatchModal from '../components/MatchModal'
import './MatchPreview.css'

const DUMMY_PHOTO_A = '/logos/logo-orange.png'
const DUMMY_PHOTO_B = null

export default function MatchPreview() {
  const [modalKey, setModalKey] = useState(0)
  const [likeType, setLikeType] = useState('heart')
  const [visible, setVisible] = useState(true)

  const show = (type) => {
    setLikeType(type)
    setModalKey(k => k + 1)
    setVisible(true)
  }

  const replay = () => {
    setModalKey(k => k + 1)
    setVisible(true)
  }

  return (
    <div className="mp-page">
      <div className="mp-header">
        <Link to="/home" className="back-arrow-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="back-label">Back</span>
        </Link>
        <h1 className="mp-title">Match Animation Preview</h1>
      </div>

      <div className="mp-controls">
        <p className="mp-hint">Choose a match type to preview the animation.</p>

        <div className="mp-toggle">
          <button
            className={`mp-toggle-btn ${likeType === 'heart' ? 'active' : ''}`}
            onClick={() => show('heart')}
          >
            It's a match!
          </button>
          <button
            className={`mp-toggle-btn ${likeType === 'friendship' ? 'active' : ''}`}
            onClick={() => show('friendship')}
          >
            You're friends!
          </button>
        </div>

        <button className="mp-replay-btn" onClick={replay}>
          ↺ Replay animation
        </button>

        {!visible && (
          <p className="mp-hint" style={{ marginTop: 8 }}>Tap a type above or Replay to show the modal again.</p>
        )}
      </div>

      {visible && (
        <MatchModal
          key={modalKey}
          myPhoto={DUMMY_PHOTO_A}
          theirPhoto={DUMMY_PHOTO_B}
          theirName="Sapph"
          likeType={likeType}
          conversationId={null}
          onClose={() => setVisible(false)}
        />
      )}
    </div>
  )
}
