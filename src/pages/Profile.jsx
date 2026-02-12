import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import './Profile.css'

function formatValue(value, fieldId) {
  if (value === undefined || value === null) return null
  if (Array.isArray(value)) return value.length ? value : null
  if (fieldId === 'dob' && value) {
    try {
      const birth = new Date(value)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
      return age > 0 ? `${age}` : value
    } catch (_) {
      return value
    }
  }
  return String(value).trim() || null
}

// Fields that are always shown on profile (no checkbox in onboarding)
const ALWAYS_VISIBLE_IDS = new Set(['full_name', 'dob', 'photos', 'bio', 'conversation_starter'])

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [resetting, setResetting] = useState(false)
  
  // Swipe gesture tracking for photos
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const handleEditProfile = () => {
    navigate('/onboarding')
  }

  const handleStartOver = async () => {
    if (!user?.id || resetting) return
    setResetting(true)
    try {
      const profileRef = doc(db, 'profiles', user.id)
      await updateDoc(profileRef, { 
        onboarding_completed: false, 
        photos: [], 
        updated_at: new Date().toISOString() 
      })
      await refreshProfile()
      navigate('/onboarding', { replace: true })
    } catch (err) {
      console.error('Start over failed:', err)
    } finally {
      setResetting(false)
    }
  }

  const profileSaveWarning = location.state?.profileSaveWarning
  const dismissSaveWarning = () => navigate('.', { replace: true, state: {} })

  const visibilitySettings = profile?.visibility_settings || {}
  const showField = (fieldId) => {
    if (ALWAYS_VISIBLE_IDS.has(fieldId)) return true
    return visibilitySettings[fieldId] !== false
  }

  if (!profile) {
    return (
      <div className="profile-loading">
        <div>
          <p>Loading your profile…</p>
          <button onClick={handleSignOut} className="signout-link" style={{ marginTop: '1rem', color: 'var(--sapph-orange)' }}>
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  const age = profile.dob ? formatValue(profile.dob, 'dob') : null
  
  // Construct info line: 30 | She/Her | Non binary | Queer | Femme | 5'3" | London, Bow
  const infoParts = [
    showField('dob') && age,
    showField('pronouns') && profile.pronouns?.length > 0 && profile.pronouns.join('/'),
    showField('gender_identity') && profile.gender_identity,
    showField('sexual_identity') && profile.sexual_identity,
    showField('gender_expression') && profile.gender_expression,
    showField('height') && profile.height,
    showField('location') && profile.location
  ].filter(Boolean)

  const infoLine = infoParts.join(' | ')

  // Construct "Looking For" line
  const lookingForParts = [
    ...(showField('connection_goals') ? (Array.isArray(profile.connection_goals) ? profile.connection_goals : [profile.connection_goals]) : []),
    ...(showField('relationship_style') ? (Array.isArray(profile.relationship_style) ? profile.relationship_style : [profile.relationship_style]) : [])
  ].filter(Boolean)
  
  const lookingForLine = lookingForParts.join(' | ')

  // Touch handlers for vertical swipe (photo navigation)
  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart({
      y: e.targetTouches[0].clientY
    })
  }

  const onTouchMove = (e) => {
    // Allow default scrolling behavior
  }

  const onTouchEnd = (e) => {
    if (!touchStart || !touchEnd) return

    const distanceY = touchEnd.y - touchStart.y
    const isUpSwipe = distanceY < -minSwipeDistance
    const isDownSwipe = distanceY > minSwipeDistance

    const photos = profile?.photos?.filter(url => url.startsWith('http')) || []
    if (photos.length > 1) {
      if (isUpSwipe && activePhotoIndex < photos.length - 1) {
        setActivePhotoIndex(prev => prev + 1)
      } else if (isDownSwipe && activePhotoIndex > 0) {
        setActivePhotoIndex(prev => prev - 1)
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  const onTouchEndCapture = (e) => {
    if (!touchStart) return
    setTouchEnd({
      y: e.changedTouches[0].clientY
    })
  }

  return (
    <div className="profile-container">
      {profileSaveWarning && (
        <div className="profile-save-warning" role="alert">
          <p>You&apos;re in! Some profile details may not have saved (connection was slow). You can redo onboarding or edit your profile to add them.</p>
          <button type="button" onClick={dismissSaveWarning} className="dismiss-warning" aria-label="Dismiss">×</button>
        </div>
      )}
      <main className="profile-card">
        {/* Photo Section – show photos or placeholder when none */}
        {showField('photos') && (
          <section 
            className="profile-photo-section"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchEndCapture={onTouchEndCapture}
          >
            {profile.photos?.length > 0 ? (
              <>
                <div className="main-photo-container">
                  <img
                    src={profile.photos.filter(url => url.startsWith('http'))[activePhotoIndex] || profile.photos.filter(url => url.startsWith('http'))[0]}
                    alt={profile.full_name}
                    className="main-photo"
                  />
                  <div className="photo-indicators">
                    {profile.photos.filter(url => url.startsWith('http')).map((_, i) => (
                      <div
                        key={i}
                        className={`photo-dot ${i === activePhotoIndex ? 'active' : ''}`}
                        onClick={() => setActivePhotoIndex(i)}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="profile-photo-placeholder" onClick={handleEditProfile}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="placeholder-icon">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <p className="placeholder-text">No photos yet</p>
                <p className="placeholder-hint">Tap to add photos</p>
              </div>
            )}
          </section>
        )}

        {/* Profile Content Section */}
        <section className="profile-content">
          <div className="profile-header-row">
            <h1 className="profile-name">{profile.full_name}</h1>
            <button onClick={handleEditProfile} className="edit-profile-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="edit-icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
          <p className="profile-info-line">{infoLine}</p>

          <div className="profile-sections">
            {lookingForLine && (
              <div className="profile-section">
                <h3 className="section-header">LOOKING FOR:</h3>
                <p className="section-text">{lookingForLine}</p>
              </div>
            )}

            {profile.bio && (
              <div className="profile-section">
                <h3 className="section-header">BIO:</h3>
                <p className="section-text">{profile.bio}</p>
              </div>
            )}

            {profile.conversation_starter && (
              <div className="conversation-starter-box">
                <h3 className="section-header">CONVERSATION STARTER:</h3>
                <p className="section-text">{profile.conversation_starter}</p>
              </div>
            )}

            {/* About Me Section - Minimalist Editorial Grid */}
            <div className="profile-section">
              <h3 className="section-header">ABOUT ME:</h3>
              <div className="minimal-grid">
                {showField('job_title') && profile.job_title && (
                  <div className="grid-item">
                    <span className="grid-label">JOB</span>
                    <span className="grid-value">{profile.job_title}</span>
                  </div>
                )}
                {showField('children') && profile.children && (
                  <div className="grid-item">
                    <span className="grid-label">KIDS</span>
                    <span className="grid-value">{profile.children}</span>
                  </div>
                )}
                {showField('zodiac_sign') && profile.zodiac_sign && (
                  <div className="grid-item">
                    <span className="grid-label">ZODIAC</span>
                    <span className="grid-value">{profile.zodiac_sign}</span>
                  </div>
                )}
                {showField('hometown') && profile.hometown && (
                  <div className="grid-item">
                    <span className="grid-label">HOME</span>
                    <span className="grid-value">{profile.hometown}</span>
                  </div>
                )}
                {showField('pets') && profile.pets && profile.pets.length > 0 && (
                  <div className="grid-item">
                    <span className="grid-label">PETS</span>
                    <span className="grid-value">{(Array.isArray(profile.pets) ? profile.pets : [profile.pets]).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vices Section - Minimalist Editorial Grid */}
            {(showField('smoking') || showField('drinking') || showField('marijuana') || showField('drugs')) && 
             (profile.smoking || profile.drinking || profile.marijuana || profile.drugs) && (
              <div className="profile-section">
                <h3 className="section-header">VICES:</h3>
                <div className="minimal-grid">
                  {showField('smoking') && profile.smoking && (
                    <div className="grid-item">
                      <span className="grid-label">SMOKE</span>
                      <span className="grid-value">{profile.smoking}</span>
                    </div>
                  )}
                  {showField('drinking') && profile.drinking && (
                    <div className="grid-item">
                      <span className="grid-label">DRINK</span>
                      <span className="grid-value">{profile.drinking}</span>
                    </div>
                  )}
                  {showField('marijuana') && profile.marijuana && (
                    <div className="grid-item">
                      <span className="grid-label">WEED</span>
                      <span className="grid-value">{profile.marijuana}</span>
                    </div>
                  )}
                  {showField('drugs') && profile.drugs && (
                    <div className="grid-item">
                      <span className="grid-label">DRUGS</span>
                      <span className="grid-value">{profile.drugs}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Intimate Section - Minimalist Grid Style */}
            {(showField('sex_preferences') || showField('kinks')) && 
             (profile.sex_preferences?.length > 0 || profile.kinks?.length > 0) && (
              <div className="profile-section">
                <h3 className="section-header">INTIMACY:</h3>
                <div className="minimal-grid">
                  {showField('sex_preferences') && profile.sex_preferences?.length > 0 && (
                    <div className="grid-item">
                      <span className="grid-label">SEX PREFERENCE</span>
                      <span className="grid-value">{profile.sex_preferences.join(', ')}</span>
                    </div>
                  )}
                  {showField('kinks') && profile.kinks?.length > 0 && (
                    <div className="grid-item">
                      <span className="grid-label">KINKS</span>
                      <span className="grid-value">{profile.kinks.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Settings */}
            <div className="profile-footer">
              <button onClick={handleEditProfile} className="profile-action-btn edit-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit Profile</span>
              </button>
              <button onClick={handleStartOver} className="profile-action-btn start-over-btn" disabled={resetting} type="button">
                {resetting ? 'Resetting…' : 'Start Over'}
              </button>
              <button onClick={handleSignOut} className="profile-action-btn signout-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/home" className={`nav-item ${pathname === '/home' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </Link>
        <Link to="/likes" className={`nav-item ${pathname === '/likes' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </Link>
        <Link to="/messages" className={`nav-item ${pathname === '/messages' || pathname.startsWith('/chat') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </Link>
        <Link to="/profile" className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </Link>
      </nav>
    </div>
  )
}
