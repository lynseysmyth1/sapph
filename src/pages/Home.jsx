import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import './Home.css'

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

export default function Home() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [resetting, setResetting] = useState(false)

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

  return (
    <div className="home-container">
      {profileSaveWarning && (
        <div className="profile-save-warning" role="alert">
          <p>You&apos;re in! Some profile details may not have saved (connection was slow). You can redo onboarding or edit your profile to add them.</p>
          <button type="button" onClick={dismissSaveWarning} className="dismiss-warning" aria-label="Dismiss">×</button>
        </div>
      )}
      <main className="profile-card">
        {/* Photo Section – show photos or placeholder when none */}
        {showField('photos') && (
          <section className="profile-photo-section">
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
                <div className="action-buttons">
                  <button className="action-btn btn-pass" aria-label="Pass">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <button className="action-btn btn-wave" aria-label="Wave">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.91 9.94c-.48-1.54-1.58-2.83-3.03-3.53-.44-.21-.9-.38-1.38-.5-.48-.12-.97-.18-1.47-.18-1.01 0-1.98.25-2.84.71-.86-.46-1.83-.71-2.84-.71-.5 0-.99.06-1.47.18-.48.12-.94.29-1.38.5-1.45.7-2.55 1.99-3.03 3.53-.12.38-.2.77-.25 1.17-.05.4-.07.8-.07 1.21 0 1.01.12 1.98.36 2.89.24.91.59 1.77 1.04 2.56.45.79.99 1.51 1.61 2.14.62.63 1.32 1.18 2.08 1.63.76.45 1.58.81 2.45 1.07.87.26 1.78.4 2.73.4s1.86-.14 2.73-.4c.87-.26 1.69-.62 2.45-1.07.76-.45 1.46-1 2.08-1.63.62-.63 1.16-1.35 1.61-2.14.45-.79.8-1.65 1.04-2.56.24-.91.36-1.88.36-2.89 0-.41-.02-.81-.07-1.21-.05-.4-.13-.79-.25-1.17z"/>
                    </svg>
                  </button>
                  <button className="action-btn btn-like" aria-label="Like">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
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
              <button onClick={handleStartOver} className="signout-btn signout-btn-secondary" disabled={resetting} type="button">
                {resetting ? 'Resetting…' : 'Start over (redo onboarding)'}
              </button>
              <button onClick={handleSignOut} className="signout-btn">Sign out</button>
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
          <span>Home</span>
        </Link>
        <Link to="/likes" className={`nav-item ${pathname === '/likes' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>Likes</span>
        </Link>
        <Link to="/home" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Chat</span>
        </Link>
        <Link to="/home" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  )
}
