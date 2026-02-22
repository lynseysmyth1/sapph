import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect, useRef } from 'react'
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
  const { user, profile, profileLoading, signOut, refreshProfile } = useAuth()
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
  
  // Swipe gesture tracking — refs update synchronously, avoiding React state async race conditions
  const touchStartRef = useRef(null)
  const touchEndRef = useRef(null)
  const swipeDirectionRef = useRef(null)

  // Track when a loading cycle started so we can enforce a minimum display time
  const loadingStartRef = useRef(null)

  // Card stack swipe animation
  const cardTrackRef = useRef(null)
  const isAnimatingRef = useRef(false)

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

  // Redirect to onboarding if profile becomes incomplete (only after profile has loaded)
  useEffect(() => {
    // Don't redirect if profile is still loading (let it finish)
    if (profileLoading) return
    
    // Only redirect if we have a confirmed incomplete profile
    if (user?.id && profile?.id && profile.onboarding_completed === false) {
      navigate('/onboarding', { replace: true })
    }
  }, [user?.id, profile?.id, profile?.onboarding_completed, profileLoading, navigate])

  // Load discovery profiles
  useEffect(() => {
    // Don't load if profile is still loading
    if (profileLoading) {
      setLoading(false)
      return
    }
    
    // If user or profile ID missing, wait
    if (!user?.id || !profile?.id) {
      setLoading(false)
      return
    }
    
    // Wait for onboarding to be completed before loading discovery
    if (profile.onboarding_completed !== true) {
      setLoading(false)
      return
    }

    const loadProfiles = async () => {
      setLoading(true)
      loadingStartRef.current = Date.now()
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile load timeout')), 15000)
        )

        const discoveryProfiles = await Promise.race([
          getDiscoveryProfiles(user.id, passedUserIds, 50),
          timeoutPromise
        ])

        setProfiles(discoveryProfiles)
        if (discoveryProfiles.length > 0) {
          setCurrentProfile(discoveryProfiles[0])
          setActivePhotoIndex(0)
        } else {
          setCurrentProfile(null)
        }
      } catch (error) {
        console.error('[Home] Error loading discovery profiles:', error.message || error)
        setProfiles([])
        setCurrentProfile(null)
      } finally {
        // Enforce 200ms minimum so skeleton never flashes then vanishes instantly
        const elapsed = Date.now() - (loadingStartRef.current || Date.now())
        const remaining = Math.max(0, 200 - elapsed)
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining))
        }
        setLoading(false)
      }
    }

    loadProfiles()
  }, [user?.id, profile?.id, profile?.onboarding_completed, profileLoading, passedUserIds])

  // Preload all photos for the current profile and the next profile's photos
  useEffect(() => {
    const currentPhotos = currentProfile?.photos?.filter(url => url.startsWith('http')) || []
    currentPhotos.slice(1).forEach(url => {
      const img = new Image()
      img.src = url
    })
    if (profiles.length > 1) {
      const nextProfile = profiles[1]
      const photos = nextProfile?.photos?.filter(url => url.startsWith('http')) || []
      photos.forEach(url => {
        const img = new Image()
        img.src = url
      })
    }
  }, [currentProfile?.id])

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

  // Touch handlers for swipe gestures — all tracking uses refs for synchronous reads
  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    if (isAnimatingRef.current) return
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }
    touchEndRef.current = null
    swipeDirectionRef.current = null
  }

  const onTouchMove = (e) => {
    if (!touchStartRef.current) return

    const deltaX = Math.abs(e.targetTouches[0].clientX - touchStartRef.current.x)
    const deltaY = Math.abs(e.targetTouches[0].clientY - touchStartRef.current.y)

    if (!swipeDirectionRef.current) {
      if (deltaY > deltaX && deltaY > 10) {
        swipeDirectionRef.current = 'vertical'
      } else if (deltaX > deltaY * 1.5 && deltaX > 15) {
        swipeDirectionRef.current = 'horizontal'
      }
    }

    // Drive the card track in real-time so the next card peeks in during the drag
    if (swipeDirectionRef.current === 'horizontal' && cardTrackRef.current) {
      const offsetX = e.targetTouches[0].clientX - touchStartRef.current.x
      // Only allow left drag (negative offsetX); clamp at 0 to prevent right drift
      const clampedX = Math.min(0, offsetX)
      cardTrackRef.current.style.transition = 'none'
      cardTrackRef.current.style.transform = `translateX(${clampedX}px)`
    }
  }

  const onTouchEndCapture = (e) => {
    if (!touchStartRef.current) return
    touchEndRef.current = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    }
  }

  const onTouchEnd = () => {
    const start = touchStartRef.current
    const end = touchEndRef.current
    const direction = swipeDirectionRef.current

    if (!start || !end) return

    const distanceX = end.x - start.x
    const distanceY = end.y - start.y
    const absX = Math.abs(distanceX)
    const absY = Math.abs(distanceY)

    // Vertical swipe on photo — cycle through photos
    if (direction === 'vertical' || (absY > absX && absY > minSwipeDistance)) {
      const photos = currentProfile?.photos?.filter(url => url.startsWith('http')) || []
      if (photos.length > 1) {
        if (distanceY < -minSwipeDistance && activePhotoIndex < photos.length - 1) {
          setActivePhotoIndex(prev => prev + 1)
        } else if (distanceY > minSwipeDistance && activePhotoIndex > 0) {
          setActivePhotoIndex(prev => prev - 1)
        }
      }
      // Reset track position in case it was briefly moved
      if (cardTrackRef.current) {
        cardTrackRef.current.style.transition = 'none'
        cardTrackRef.current.style.transform = 'translateX(0)'
      }
    }
    // Horizontal swipe — animate between profiles
    else if (direction === 'horizontal' || (absX > absY && absX > minSwipeDistance)) {
      if (distanceX < -minSwipeDistance) {
        // Left swipe — show next profile with peek animation
        if (cardTrackRef.current && profiles.length > 1) {
          const commitThreshold = window.innerWidth * 0.35
          isAnimatingRef.current = true
          if (absX >= commitThreshold) {
            // Committed — animate card fully off screen, then swap
            cardTrackRef.current.style.transition = 'transform 0.28s ease'
            cardTrackRef.current.style.transform = 'translateX(-50%)'
            setTimeout(() => {
              if (cardTrackRef.current) {
                cardTrackRef.current.style.transition = 'none'
                cardTrackRef.current.style.transform = 'translateX(0)'
              }
              loadNextProfile()
              isAnimatingRef.current = false
            }, 280)
          } else {
            // Not far enough — snap back to start
            cardTrackRef.current.style.transition = 'transform 0.2s ease'
            cardTrackRef.current.style.transform = 'translateX(0)'
            setTimeout(() => { isAnimatingRef.current = false }, 200)
          }
        } else {
          loadNextProfile()
        }
      } else if (distanceX > minSwipeDistance) {
        // Right swipe — snap back (previous profile peek not supported yet)
        if (cardTrackRef.current) {
          cardTrackRef.current.style.transition = 'transform 0.2s ease'
          cardTrackRef.current.style.transform = 'translateX(0)'
          setTimeout(() => { isAnimatingRef.current = false }, 200)
        }
        loadPreviousProfile()
      }
    } else if (cardTrackRef.current) {
      // Sub-threshold drag — snap back
      cardTrackRef.current.style.transition = 'transform 0.2s ease'
      cardTrackRef.current.style.transform = 'translateX(0)'
      setTimeout(() => { isAnimatingRef.current = false }, 200)
    }

    touchStartRef.current = null
    touchEndRef.current = null
    swipeDirectionRef.current = null
  }

  const visibilitySettings = currentProfile?.visibility_settings || {}
  const showField = (fieldId) => {
    if (ALWAYS_VISIBLE_IDS.has(fieldId)) return true
    return visibilitySettings[fieldId] !== false
  }

  // Next card for the peek-swipe preview (lightweight: photo + name only)
  const nextProfile = profiles.length > 1 ? profiles[1] : null

  if (!profile) {
    if (profileLoading) {
      return (
        <div className="app-loading">
          <div className="app-loading-brand">
            <div className="app-loading-logo">S</div>
            <div className="app-loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="profile-loading">
        <div>
          <p>Something went wrong loading your profile.</p>
          <button onClick={handleSignOut} className="signout-link" style={{ marginTop: '1rem', color: 'var(--sapph-orange)' }}>
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="home-container">
        <div className="card-stage">
        <div className="profile-scroll-area" style={{ width: '100%' }}>
          <div className="skeleton-photo skeleton-shimmer"></div>
          <div className="skeleton-actions">
            <div className="skeleton-btn skeleton-shimmer"></div>
            <div className="skeleton-btn skeleton-shimmer"></div>
            <div className="skeleton-btn skeleton-shimmer"></div>
          </div>
          <div className="skeleton-content">
            <div className="skeleton-line skeleton-name skeleton-shimmer"></div>
            <div className="skeleton-line skeleton-info skeleton-shimmer"></div>
            <div className="skeleton-line skeleton-head skeleton-shimmer"></div>
            <div className="skeleton-line skeleton-para-1 skeleton-shimmer"></div>
            <div className="skeleton-line skeleton-para-2 skeleton-shimmer"></div>
            <div className="skeleton-line skeleton-head skeleton-shimmer"></div>
            <div className="skeleton-line skeleton-para-1 skeleton-shimmer"></div>
            <div className="skeleton-line skeleton-para-3 skeleton-shimmer"></div>
          </div>
        </div>
        </div>
        <nav className="bottom-nav">
          <Link to="/home" className={`nav-item ${pathname === '/home' ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="nav-icon"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          </Link>
          <Link to="/likes" className={`nav-item ${pathname === '/likes' ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </Link>
          <Link to="/messages" className={`nav-item ${pathname === '/messages' || pathname.startsWith('/chat') ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </Link>
          <Link to="/profile" className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </Link>
        </nav>
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

      <div className="card-stage">
        <div className="card-track" ref={cardTrackRef}>

          {/* Current profile — full card with all interactive content */}
          <div className="profile-scroll-area">
            <main className="profile-card">
              {/* Photo Section – touch handlers scoped here so swipe cycles photos without blocking page scroll */}
              {showField('photos') && (
                <section
                  className="profile-photo-section"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onTouchEndCapture={onTouchEndCapture}
                >
                  {currentProfile.photos?.length > 0 ? (
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

              {/* Action Buttons – sibling of photo section, overlaps via negative margin-top */}
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
                  <svg viewBox="0 0 100 110" fill="currentColor">
                    <path d="m85.066 41.953c-2.082-2.2188-5.5664-2.4609-7.9336-0.54688l-8.082 6.5234 10.828-17.215c0.91406-1.457 1.1875-3.1758 0.76562-4.8398s-1.4805-3.0469-2.9766-3.8906c-2.7773-1.5625-6.2695-0.78125-8.1172 1.8125l-8.1758 11.492 6.957-16.344c0.70703-1.6641 0.71094-3.4961 0.003907-5.1602-0.70313-1.6641-2.0195-2.9414-3.707-3.5898-3.2344-1.2461-6.9141 0.23828-8.3711 3.3828l-8.3984 18.113 2.9141-14.832c0.66016-3.3672-1.5273-6.6836-4.8828-7.3984-3.2461-0.6875-6.4961 1.2656-7.3984 4.4609-1.6602 5.8828-4.6875 16.844-6.2969 24.125-1.4023 6.3516-4.3008 10.016-6.1094 11.773-2.0664-6.2578-5.6875-10.453-11.023-12.781-2.3164-1.0117-4.7578-1.1094-6.9102-0.26172-1.6406 0.65234-2.8242 1.9961-3.0898 3.5039-0.39062 2.1914 1.1211 4.0352 1.9336 5.0273 3.2461 3.9609 3.6523 9.4219 4.0469 14.707l0.085937 1.1602c0.53906 6.9453 2.832 13.293 6.6289 18.363 4.1914 5.5977 12.234 8.7539 14.602 9.5859 2.9492 1.0391 5.9219 1.5586 8.7734 1.5586 2.7148 0 5.3203-0.47266 7.6914-1.4141 7.5117-2.9883 14.059-10.684 20.008-23.52l16.043-15.605c2.2695-2.207 2.3516-5.8789 0.1875-8.1875zm-2.2773 6.0352-16.242 15.801c-0.13281 0.12891-0.23828 0.28125-0.31641 0.44922-5.6445 12.254-11.699 19.531-18.508 22.242-4.1875 1.668-9.2891 1.6016-14.359-0.1875-5.7773-2.0352-10.711-5.2344-13.199-8.5586-3.457-4.6133-5.543-10.422-6.0391-16.797l-0.085938-1.1484c-0.41016-5.4805-0.87109-11.688-4.7188-16.383-0.69922-0.85547-1.4375-1.832-1.3008-2.6016 0.085938-0.47656 0.58594-0.97656 1.2734-1.25 0.59375-0.23438 1.2383-0.35156 1.9023-0.35156 0.86719 0 1.7734 0.19531 2.668 0.58594 5.0312 2.1953 8.2852 6.4336 9.9531 12.961 0.027344 0.125 0.074219 0.25 0.13672 0.37109 0.019531 0.039062 0.042969 0.074218 0.066406 0.10938 0.19141 0.29688 0.47656 0.50781 0.79297 0.60938 8.5547 2.8672 11.852 8.3164 10.383 17.152-0.13672 0.81641 0.41406 1.5898 1.2344 1.7266 0.8125 0.13672 1.5898-0.41406 1.7266-1.2344 1.5625-9.3789-1.7773-15.941-9.9336-19.543 2.1562-2.0977 5.3516-6.2266 6.9023-13.25 1.5938-7.207 4.6016-18.105 6.2539-23.957 0.47266-1.6758 2.1797-2.707 3.8828-2.3398 1.7617 0.375 2.9141 2.1172 2.5664 3.8867l-5.3125 27.035c-0.14453 0.74609 0.28516 1.4805 1.0078 1.7148 0.71875 0.23438 1.5039-0.10547 1.8242-0.79688l13.629-29.395c0.79688-1.7188 2.8047-2.5273 4.5703-1.8477 0.92188 0.35547 1.6406 1.0508 2.0234 1.9609 0.38281 0.91016 0.38281 1.9102-0.003906 2.8164l-12.375 29.074c-0.30078 0.70312-0.019531 1.5234 0.64844 1.8945 0.66797 0.37109 1.5117 0.18359 1.9531-0.4375l16.195-22.766c0.95703-1.3438 2.7617-1.75 4.2031-0.9375 0.77344 0.4375 1.3242 1.1523 1.543 2.0117 0.21875 0.86328 0.078125 1.7539-0.39453 2.5039l-15.625 24.84c-0.39062 0.62109-0.27344 1.4336 0.27344 1.918 0.54688 0.48828 1.3672 0.50781 1.9375 0.046875l15.086-12.18c1.1484-0.92969 2.8477-0.8125 3.8594 0.26562 1.0547 1.125 1.0117 2.9102-0.089844 3.9844zm-59.648-24.473c0.70703-5.1758 3.5312-9.9219 7.7422-13.016 0.66797-0.48828 1.6055-0.34766 2.0977 0.32031 0.48828 0.66797 0.34766 1.6055-0.32031 2.0977-3.5078 2.5742-5.9531 6.6875-6.543 11.004-0.10156 0.75-0.74609 1.2969-1.4844 1.2969-0.066406 0-0.13672-0.003906-0.20312-0.015625-0.82031-0.11328-1.3945-0.86719-1.2812-1.6875zm-3.3125-6.8867c0.74219-2.1914 2.0078-4.207 3.6602-5.832 0.58984-0.58203 1.5391-0.57422 2.1211 0.015625s0.57422 1.5391-0.015625 2.1211c-1.3164 1.2969-2.3281 2.9102-2.9219 4.6602-0.21094 0.625-0.79688 1.0195-1.4219 1.0195-0.16016 0-0.32031-0.027343-0.48047-0.078125-0.78516-0.26562-1.2031-1.1172-0.9375-1.9023zm71.488 37.699c-0.69922 4.7383-3.4844 9.168-7.4492 11.855-0.25781 0.17578-0.55078 0.25781-0.83984 0.25781-0.48047 0-0.95312-0.23047-1.2422-0.65625-0.46484-0.6875-0.28516-1.6172 0.39844-2.082 3.2812-2.2227 5.5859-5.8906 6.1641-9.8125 0.12109-0.82031 0.88672-1.3828 1.7031-1.2656 0.82031 0.12109 1.3867 0.88281 1.2656 1.7031zm3.5898 6.8359c-0.66406 1.793-1.7734 3.4102-3.2109 4.6758-0.28516 0.25-0.63672 0.375-0.98828 0.375-0.41406 0-0.82812-0.17188-1.125-0.50781-0.54688-0.62109-0.48438-1.5703 0.13672-2.1172 1.0664-0.9375 1.8867-2.1367 2.3789-3.4648 0.28516-0.77734 1.1484-1.1719 1.9258-0.88672 0.77734 0.28906 1.1719 1.1484 0.88672 1.9258z"/>
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
          </div>

          {/* Next profile — photo + name preview only (lightweight, already preloaded) */}
          <div className="profile-scroll-area">
            {nextProfile && (
              <div className="next-card-photo-wrap">
                <img
                  src={nextProfile.photos?.filter(url => url.startsWith('http'))[0]}
                  className="main-photo"
                  alt={nextProfile.full_name}
                />
                <div className="next-card-name-overlay">
                  <span>{nextProfile.full_name}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

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
