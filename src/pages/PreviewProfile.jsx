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

// Strip "Prefer not to say" / "Prefer not to share" answers before display
const filterPreferNotToSay = (arr) =>
  (arr || []).filter(v => v !== 'Prefer not to say' && v !== 'Prefer not to share')

// Map legacy political alignment values to simplified display labels
const POLITICAL_DISPLAY = {
  'Progressive': 'Left',
  'Liberal': 'Left',
  'Center left': 'Left',
  'Centrist': 'Center',
  'Center right': 'Right',
  'Conservative': 'Right',
}
const displayPolitical = (val) => POLITICAL_DISPLAY[val] || val

// Fields that are always shown on profile (no checkbox in onboarding)
const ALWAYS_VISIBLE_IDS = new Set(['full_name', 'dob', 'photos', 'bio', 'conversation_starter'])

export default function PreviewProfile() {
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
  
  // Construct info line: 30 | She/Her | Non binary | Queer | Femme
  const infoParts = [
    showField('dob') && age,
    showField('pronouns') && filterPreferNotToSay(profile.pronouns).length > 0 && filterPreferNotToSay(profile.pronouns).join('/'),
    showField('gender_identity') && profile.gender_identity,
    showField('sexual_identity') && profile.sexual_identity,
    showField('gender_expression') && profile.gender_expression
  ].filter(Boolean)

  const infoLine = infoParts.join(' | ')

  // Construct "Looking For" line
  const lookingForParts = [
    ...(showField('connection_goals') ? filterPreferNotToSay(Array.isArray(profile.connection_goals) ? profile.connection_goals : [profile.connection_goals]) : []),
    ...(showField('relationship_style') ? filterPreferNotToSay(Array.isArray(profile.relationship_style) ? profile.relationship_style : [profile.relationship_style]) : [])
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
      <div className="preview-profile-header">
        <Link to="/profile" className="back-arrow-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"></path>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span className="back-label">Back</span>
        </Link>
      </div>
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

            {/* About Me Section - Grouped Categories */}
            <div className="profile-section">
              <h3 className="section-header">ABOUT ME:</h3>
              
              {/* WORK & LIFE Category */}
              {((showField('job_title') && profile.job_title) || 
                (showField('location') && profile.location) || 
                (showField('hometown') && profile.hometown) || 
                (showField('pets') && profile.pets && profile.pets.length > 0)) && (
                <div className="about-me-category">
                  <h4 className="category-label">WORK & LIFE</h4>
                  <div className="category-items">
                    {showField('job_title') && profile.job_title && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Job</span>
                        <span className="category-value">{profile.job_title}</span>
                      </span>
                    )}
                    {showField('location') && profile.location && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Lives in</span>
                        <span className="category-value">{profile.location}</span>
                      </span>
                    )}
                    {showField('hometown') && profile.hometown && (
                      <span className="category-item">
                        <span className="category-label sentence-case">From</span>
                        <span className="category-value">{profile.hometown}</span>
                      </span>
                    )}
                    {showField('pets') && profile.pets && profile.pets.length > 0 && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Pets</span>
                        <span className="category-value">{(Array.isArray(profile.pets) ? profile.pets : [profile.pets]).join(', ')}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* IDENTITY Category */}
              {((showField('political_alignment') && profile.political_alignment) || 
                (showField('zodiac_sign') && profile.zodiac_sign) || 
                (showField('children') && profile.children) || 
                (showField('height') && profile.height)) && (
                <div className="about-me-category">
                  <h4 className="category-label">IDENTITY</h4>
                  <div className="category-items">
                    {showField('height') && profile.height && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Height</span>
                        <span className="category-value">{profile.height}</span>
                      </span>
                    )}
                    {showField('children') && profile.children && profile.children !== 'Prefer not to say' && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Family plans</span>
                        <span className="category-value">{profile.children}</span>
                      </span>
                    )}
                    {showField('political_alignment') && profile.political_alignment
                      && profile.political_alignment !== 'Prefer not to say'
                      && profile.political_alignment !== 'Prefer not to share' && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Politics</span>
                        <span className="category-value">{displayPolitical(profile.political_alignment)}</span>
                      </span>
                    )}
                    {showField('zodiac_sign') && profile.zodiac_sign && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Zodiac</span>
                        <span className="category-value">{profile.zodiac_sign}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vices Section - Grouped Category Style */}
            {(showField('smoking') || showField('drinking') || showField('marijuana') || showField('drugs')) && 
             (profile.smoking || profile.drinking || profile.marijuana || profile.drugs) && (
              <div className="profile-section">
                <h3 className="section-header">VICES:</h3>
                <div className="about-me-category">
                  <div className="category-items">
                    {showField('smoking') && profile.smoking && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Smoke</span>
                        <span className="category-value">{profile.smoking}</span>
                      </span>
                    )}
                    {showField('drinking') && profile.drinking && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Drink</span>
                        <span className="category-value">{profile.drinking}</span>
                      </span>
                    )}
                    {showField('marijuana') && profile.marijuana && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Weed</span>
                        <span className="category-value">{profile.marijuana}</span>
                      </span>
                    )}
                    {showField('drugs') && profile.drugs && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Other drugs</span>
                        <span className="category-value">{profile.drugs}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Intimate Section - Grouped Category Style */}
            {(showField('sex_preferences') || showField('kinks')) && 
             (filterPreferNotToSay(profile.sex_preferences).length > 0 || filterPreferNotToSay(profile.kinks).length > 0) && (
              <div className="profile-section">
                <h3 className="section-header">INTIMACY:</h3>
                <div className="about-me-category">
                  <div className="category-items">
                    {showField('sex_preferences') && filterPreferNotToSay(profile.sex_preferences).length > 0 && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Sex preference</span>
                        <span className="category-value">{filterPreferNotToSay(profile.sex_preferences).join(', ')}</span>
                      </span>
                    )}
                    {showField('kinks') && filterPreferNotToSay(profile.kinks).length > 0 && (
                      <span className="category-item">
                        <span className="category-label sentence-case">Kinks</span>
                        <span className="category-value">{filterPreferNotToSay(profile.kinks).join(', ')}</span>
                      </span>
                    )}
                  </div>
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
