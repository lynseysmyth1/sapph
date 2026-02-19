import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { recordLike } from '../lib/chatHelpers'
import { getDiscoveryProfiles } from '../lib/discoveryHelpers'
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
  const [currentProfile, setCurrentProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false) // Start false, will be set true when actually loading profiles
  const [liking, setLiking] = useState(false)
  const [showMatch, setShowMatch] = useState(false)
  const [matchedUserId, setMatchedUserId] = useState(null)
  const [passedUserIds, setPassedUserIds] = useState([])
  
  // Swipe gesture tracking
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [swipeDirection, setSwipeDirection] = useState(null) // 'vertical' or 'horizontal'

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

  // New users: send to onboarding so they complete profile before discovery
  useEffect(() => {
    // Don't redirect if we just completed onboarding (sessionStorage survives reload / hash change)
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('onboardingComplete') === user?.id) return
    if (location.state?.fromOnboardingComplete) return
    // Only redirect if we have a confirmed profile with onboarding explicitly false (not undefined)
    // If onboarding_completed is undefined, wait for profile fetch to complete
    if (user?.id && profile?.id && profile.onboarding_completed === false) {
      navigate('/onboarding', { replace: true })
    }
  }, [user?.id, profile?.id, profile?.onboarding_completed, navigate, location.state?.fromOnboardingComplete])

  // Load discovery profiles
  useEffect(() => {
    const justCompleted = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('onboardingComplete') === user?.id
    const completed = profile?.onboarding_completed || location.state?.fromOnboardingComplete || justCompleted
    
    console.log('[Home] Discovery profiles check:', {
      userId: user?.id,
      profileId: profile?.id,
      onboardingCompleted: profile?.onboarding_completed,
      justCompleted: justCompleted,
      completed: completed,
      sessionStorageFlag: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onboardingComplete') : 'N/A'
    });
    
    // If user or profile ID missing, wait
    if (!user?.id || !profile?.id) {
      console.log('[Home] ⏳ Waiting for user/profile ID');
      setLoading(false)
      return
    }
    
    // If onboarding not completed, don't load profiles (will redirect to onboarding)
    if (!completed) {
      console.log('[Home] ⏸️ Onboarding not completed, not loading profiles');
      setLoading(false)
      return
    }

    console.log('[Home] ✅ Loading discovery profiles...');
    const loadProfiles = async () => {
      setLoading(true)
      try {
        // Add timeout to prevent hanging forever (increased to 15s for slow networks)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile load timeout')), 15000)
        )
        
        const discoveryProfiles = await Promise.race([
          getDiscoveryProfiles(user.id, passedUserIds, 50),
          timeoutPromise
        ])
        
        console.log('[Home] ✅ Loaded', discoveryProfiles.length, 'discovery profiles');
        setProfiles(discoveryProfiles)
        if (discoveryProfiles.length > 0) {
          setCurrentProfile(discoveryProfiles[0])
          setActivePhotoIndex(0)
        } else {
          // No profiles found - show empty state
          console.log('[Home] ℹ️ No discovery profiles found');
          setCurrentProfile(null)
        }
      } catch (error) {
        console.error('[Home] ❌ Error loading discovery profiles:', error.message || error)
        console.error('[Home] ❌ Full error:', error)
        // Set empty profiles so user sees "No more profiles" instead of stuck loading
        setProfiles([])
        setCurrentProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadProfiles()
  }, [user?.id, profile?.id, profile?.onboarding_completed, passedUserIds, location.state?.fromOnboardingComplete])

  const handleLike = async (likeType) => {
    if (!currentProfile || !user?.id || liking) return

    setLiking(true)
    try {
      const result = await recordLike(user.id, currentProfile.id, likeType)
      
      if (result.isMatch) {
        // Show match notification
        setShowMatch(true)
        setMatchedUserId(currentProfile.id)
        
        // After 3 seconds, navigate to messages or show next profile
        setTimeout(() => {
          setShowMatch(false)
          loadNextProfile()
        }, 3000)
      } else {
        // Just liked, show next profile
        loadNextProfile()
      }
    } catch (error) {
      console.error('Error recording like:', error)
      alert('Failed to record like. Please try again.')
    } finally {
      setLiking(false)
    }
  }

  const handlePass = () => {
    if (!currentProfile) return
    setPassedUserIds(prev => [...prev, currentProfile.id])
    loadNextProfile()
  }

  const loadNextProfile = () => {
    if (profiles.length <= 1) {
      // No more profiles, reload discovery
      setCurrentProfile(null)
      setProfiles([])
      // Trigger reload
      setPassedUserIds(prev => [...prev])
      return
    }
    
    // Remove current profile and show next one
    const remaining = profiles.slice(1)
    setProfiles(remaining)
    if (remaining.length > 0) {
      setCurrentProfile(remaining[0])
      setActivePhotoIndex(0)
    }
  }

  const loadPreviousProfile = () => {
    // For now, just reload from discovery
    // In a real app, you might want to maintain a history
    setPassedUserIds(prev => prev.slice(0, -1))
  }

  const handleReloadAllProfiles = () => {
    // Reset passedUserIds to empty array, which will trigger useEffect to reload all profiles
    setPassedUserIds([])
    setLoading(true)
  }

  // Touch handlers for swipe gestures
  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
    setSwipeDirection(null)
  }

  const onTouchMove = (e) => {
    if (!touchStart) return
    
    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }
    
    const deltaX = Math.abs(currentTouch.x - touchStart.x)
    const deltaY = Math.abs(currentTouch.y - touchStart.y)
    
    // Determine swipe direction based on which axis has more movement
    if (!swipeDirection) {
      if (deltaY > deltaX && deltaY > 10) {
        setSwipeDirection('vertical')
      } else if (deltaX > deltaY && deltaX > 10) {
        setSwipeDirection('horizontal')
      }
    }
  }

  const onTouchEnd = (e) => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchEnd.x - touchStart.x
    const distanceY = touchEnd.y - touchStart.y
    const isLeftSwipe = distanceX < -minSwipeDistance
    const isRightSwipe = distanceX > minSwipeDistance
    const isUpSwipe = distanceY < -minSwipeDistance
    const isDownSwipe = distanceY > minSwipeDistance

    // Handle vertical swipe (photo navigation)
    if (swipeDirection === 'vertical' || (Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > minSwipeDistance)) {
      const photos = currentProfile?.photos?.filter(url => url.startsWith('http')) || []
      if (photos.length > 1) {
        if (isUpSwipe && activePhotoIndex < photos.length - 1) {
          setActivePhotoIndex(prev => prev + 1)
        } else if (isDownSwipe && activePhotoIndex > 0) {
          setActivePhotoIndex(prev => prev - 1)
        }
      }
    }
    // Handle horizontal swipe (profile navigation)
    else if (swipeDirection === 'horizontal' || (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance)) {
      if (isLeftSwipe) {
        // Swipe left - next profile
        loadNextProfile()
      } else if (isRightSwipe) {
        // Swipe right - previous profile
        loadPreviousProfile()
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
    setSwipeDirection(null)
  }

  const onTouchEndCapture = (e) => {
    if (!touchStart) return
    setTouchEnd({
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    })
  }

  const visibilitySettings = currentProfile?.visibility_settings || {}
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

  if (loading) {
    return (
      <div className="profile-loading">
        <div>
          <p>Loading profiles…</p>
        </div>
      </div>
    )
  }

  if (!currentProfile) {
    return (
      <div className="home-container">
        <main className="profile-card">
          <div className="profile-loading">
            <div style={{ textAlign: 'center' }}>
              <p>No more new profiles to view right now.</p>
              <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '8px', marginBottom: '1.5rem' }}>
                Would you like to see all profiles again?
              </p>
              <button 
                onClick={handleReloadAllProfiles}
                disabled={loading}
                className="reload-profiles-btn"
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: 'var(--sapph-orange)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontWeight: '500',
                  display: 'block',
                  margin: '0 auto'
                }}
              >
                {loading ? 'Loading...' : 'See All Profiles Again'}
              </button>
            </div>
          </div>
        </main>
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

  const age = currentProfile.dob ? formatValue(currentProfile.dob, 'dob') : null
  
  // Construct info line: 30 | She/Her | Non binary | Queer | Femme | 5'3" | London, Bow
  const infoParts = [
    showField('dob') && age,
    showField('pronouns') && currentProfile.pronouns?.length > 0 && currentProfile.pronouns.join('/'),
    showField('gender_identity') && currentProfile.gender_identity,
    showField('sexual_identity') && currentProfile.sexual_identity,
    showField('gender_expression') && currentProfile.gender_expression,
    showField('height') && currentProfile.height,
    showField('location') && currentProfile.location
  ].filter(Boolean)

  const infoLine = infoParts.join(' | ')

  // Construct "Looking For" line
  const lookingForParts = [
    ...(showField('connection_goals') ? (Array.isArray(currentProfile.connection_goals) ? currentProfile.connection_goals : [currentProfile.connection_goals]) : []),
    ...(showField('relationship_style') ? (Array.isArray(currentProfile.relationship_style) ? currentProfile.relationship_style : [currentProfile.relationship_style]) : [])
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
      {/* Match Notification */}
      {showMatch && (
        <div className="match-overlay">
          <div className="match-modal">
            <h2 className="match-title">It's a Match! 🎉</h2>
            <p className="match-text">You and {currentProfile?.full_name} liked each other!</p>
            <button 
              className="match-button" 
              onClick={() => {
                setShowMatch(false)
                navigate('/messages')
              }}
            >
              Start Chatting
            </button>
          </div>
        </div>
      )}

      <main 
        className="profile-card"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchEndCapture={onTouchEndCapture}
      >
        {/* Photo Section – show photos or placeholder when none */}
        {showField('photos') && (
          <section className="profile-photo-section">
            {currentProfile.photos?.length > 0 ? (
              <>
                <div className="main-photo-container">
                  <img
                    src={currentProfile.photos.filter(url => url.startsWith('http'))[activePhotoIndex] || currentProfile.photos.filter(url => url.startsWith('http'))[0]}
                    alt={currentProfile.full_name}
                    className="main-photo"
                  />
                  <div className="photo-indicators">
                    {currentProfile.photos.filter(url => url.startsWith('http')).map((_, i) => (
                      <div
                        key={i}
                        className={`photo-dot ${i === activePhotoIndex ? 'active' : ''}`}
                        onClick={() => setActivePhotoIndex(i)}
                      />
                    ))}
                  </div>
                </div>
                <div className="action-buttons">
                  <button 
                    className="action-btn btn-pass" 
                    aria-label="Pass"
                    onClick={handlePass}
                    disabled={liking}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <button 
                    className="action-btn btn-wave" 
                    aria-label="Wave"
                    onClick={() => handleLike('friendship')}
                    disabled={liking}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.91 9.94c-.48-1.54-1.58-2.83-3.03-3.53-.44-.21-.9-.38-1.38-.5-.48-.12-.97-.18-1.47-.18-1.01 0-1.98.25-2.84.71-.86-.46-1.83-.71-2.84-.71-.5 0-.99.06-1.47.18-.48.12-.94.29-1.38.5-1.45.7-2.55 1.99-3.03 3.53-.12.38-.2.77-.25 1.17-.05.4-.07.8-.07 1.21 0 1.01.12 1.98.36 2.89.24.91.59 1.77 1.04 2.56.45.79.99 1.51 1.61 2.14.62.63 1.32 1.18 2.08 1.63.76.45 1.58.81 2.45 1.07.87.26 1.78.4 2.73.4s1.86-.14 2.73-.4c.87-.26 1.69-.62 2.45-1.07.76-.45 1.46-1 2.08-1.63.62-.63 1.16-1.35 1.61-2.14.45-.79.8-1.65 1.04-2.56.24-.91.36-1.88.36-2.89 0-.41-.02-.81-.07-1.21-.05-.4-.13-.79-.25-1.17z"/>
                    </svg>
                  </button>
                  <button 
                    className="action-btn btn-like" 
                    aria-label="Like"
                    onClick={() => handleLike('heart')}
                    disabled={liking}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="profile-photo-placeholder">
                <div className="avatar-placeholder-large">
                  {currentProfile.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <p className="placeholder-text">No photos</p>
              </div>
            )}
          </section>
        )}

        {/* Profile Content Section */}
        <section className="profile-content">
          <div className="profile-header-row">
            <h1 className="profile-name">{currentProfile.full_name}</h1>
          </div>
          <p className="profile-info-line">{infoLine}</p>

          <div className="profile-sections">
            {lookingForLine && (
              <div className="profile-section">
                <h3 className="section-header">LOOKING FOR:</h3>
                <p className="section-text">{lookingForLine}</p>
              </div>
            )}

            {currentProfile.bio && (
              <div className="profile-section">
                <h3 className="section-header">BIO:</h3>
                <p className="section-text">{currentProfile.bio}</p>
              </div>
            )}

            {currentProfile.conversation_starter && (
              <div className="conversation-starter-box">
                <h3 className="section-header">CONVERSATION STARTER:</h3>
                <p className="section-text">{currentProfile.conversation_starter}</p>
              </div>
            )}

            {/* About Me Section - Minimalist Editorial Grid */}
            <div className="profile-section">
              <h3 className="section-header">ABOUT ME:</h3>
              <div className="minimal-grid">
                {showField('job_title') && currentProfile.job_title && (
                  <div className="grid-item">
                    <span className="grid-label">JOB</span>
                    <span className="grid-value">{currentProfile.job_title}</span>
                  </div>
                )}
                {showField('children') && currentProfile.children && (
                  <div className="grid-item">
                    <span className="grid-label">KIDS</span>
                    <span className="grid-value">{currentProfile.children}</span>
                  </div>
                )}
                {showField('zodiac_sign') && currentProfile.zodiac_sign && (
                  <div className="grid-item">
                    <span className="grid-label">ZODIAC</span>
                    <span className="grid-value">{currentProfile.zodiac_sign}</span>
                  </div>
                )}
                {showField('hometown') && currentProfile.hometown && (
                  <div className="grid-item">
                    <span className="grid-label">HOME</span>
                    <span className="grid-value">{currentProfile.hometown}</span>
                  </div>
                )}
                {showField('pets') && currentProfile.pets && currentProfile.pets.length > 0 && (
                  <div className="grid-item">
                    <span className="grid-label">PETS</span>
                    <span className="grid-value">{(Array.isArray(currentProfile.pets) ? currentProfile.pets : [currentProfile.pets]).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vices Section - Minimalist Editorial Grid */}
            {(showField('smoking') || showField('drinking') || showField('marijuana') || showField('drugs')) && 
             (currentProfile.smoking || currentProfile.drinking || currentProfile.marijuana || currentProfile.drugs) && (
              <div className="profile-section">
                <h3 className="section-header">VICES:</h3>
                <div className="minimal-grid">
                  {showField('smoking') && currentProfile.smoking && (
                    <div className="grid-item">
                      <span className="grid-label">SMOKE</span>
                      <span className="grid-value">{currentProfile.smoking}</span>
                    </div>
                  )}
                  {showField('drinking') && currentProfile.drinking && (
                    <div className="grid-item">
                      <span className="grid-label">DRINK</span>
                      <span className="grid-value">{currentProfile.drinking}</span>
                    </div>
                  )}
                  {showField('marijuana') && currentProfile.marijuana && (
                    <div className="grid-item">
                      <span className="grid-label">WEED</span>
                      <span className="grid-value">{currentProfile.marijuana}</span>
                    </div>
                  )}
                  {showField('drugs') && currentProfile.drugs && (
                    <div className="grid-item">
                      <span className="grid-label">DRUGS</span>
                      <span className="grid-value">{currentProfile.drugs}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Intimate Section - Minimalist Grid Style */}
            {(showField('sex_preferences') || showField('kinks')) && 
             (currentProfile.sex_preferences?.length > 0 || currentProfile.kinks?.length > 0) && (
              <div className="profile-section">
                <h3 className="section-header">INTIMACY:</h3>
                <div className="minimal-grid">
                  {showField('sex_preferences') && currentProfile.sex_preferences?.length > 0 && (
                    <div className="grid-item">
                      <span className="grid-label">SEX PREFERENCE</span>
                      <span className="grid-value">{currentProfile.sex_preferences.join(', ')}</span>
                    </div>
                  )}
                  {showField('kinks') && currentProfile.kinks?.length > 0 && (
                    <div className="grid-item">
                      <span className="grid-label">KINKS</span>
                      <span className="grid-value">{currentProfile.kinks.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
