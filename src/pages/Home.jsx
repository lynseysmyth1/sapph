import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDiscovery } from '../contexts/DiscoveryContext'
import { useState, useEffect, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { recordLike, recordPass } from '../lib/chatHelpers'
import { useUnreadCount } from '../lib/useUnreadCount'
import MatchModal from '../components/MatchModal'
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

// Strip "Prefer not to say" / "Prefer not to share" answers before display
const filterPreferNotToSay = (arr) =>
  (arr || []).filter(v => v !== 'Prefer not to say' && v !== 'Prefer not to share')

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

export default function Home() {
  const { user, profile, profileLoading, signOut, refreshProfile } = useAuth()
  const {
    profiles,
    currentProfile,
    loading,
    hasLoaded,
    loadNextProfile,
    handleReloadAllProfiles,
    addPassedUserId,
    removeLastPassedUserId,
  } = useDiscovery()
  const unreadCount = useUnreadCount()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [resetting, setResetting] = useState(false)
  const [liking, setLiking] = useState(false)
  const [showMatch, setShowMatch] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState(null)
  const [matchedConversationId, setMatchedConversationId] = useState(null)
  const [matchedLikeType, setMatchedLikeType] = useState(null)

  // Swipe gesture tracking — refs update synchronously, avoiding React state async race conditions
  const touchStartRef = useRef(null)
  const touchEndRef = useRef(null)
  const swipeDirectionRef = useRef(null)
  // Prevents onClick firing after a touch swipe already handled photo cycling
  const touchHandledRef = useRef(false)

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

  // Reset photo index and preload photos when the current profile changes
  useEffect(() => {
    setActivePhotoIndex(0)
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

  // Keyboard navigation for web — arrow keys to pass/go back, L/F to like/friend
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentProfile || liking) return
      if (e.key === 'ArrowRight') handlePass()
      if (e.key === 'ArrowLeft') loadPreviousProfile()
      if (e.key === 'l' || e.key === 'L') handleLike('heart')
      if (e.key === 'f' || e.key === 'F') handleLike('friendship')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentProfile, liking])

  // Animate the current card off to the left, then run callback
  const animateCardOut = (direction = 'left', callback) => {
    if (!cardTrackRef.current) { callback(); return }
    isAnimatingRef.current = true
    const translateTarget = direction === 'left' ? '-50%' : '50%'
    cardTrackRef.current.style.transition = 'transform 0.25s ease'
    cardTrackRef.current.style.transform = `translateX(${translateTarget})`
    setTimeout(() => {
      callback()
      requestAnimationFrame(() => {
        if (cardTrackRef.current) {
          cardTrackRef.current.style.transition = 'none'
          cardTrackRef.current.style.transform = 'translateX(0)'
        }
        isAnimatingRef.current = false
      })
    }, 250)
  }

  const handleLike = async (likeType) => {
    if (!currentProfile || !user?.id || liking) return

    const likedProfile = currentProfile

    setLiking(true)

    // 1. Animate immediately (optimistic — same as Pass)
    animateCardOut('left', () => loadNextProfile())

    // 2. Save in background; show match overlay when result returns
    try {
      const result = await recordLike(user.id, likedProfile.id, likeType)
      if (result?.isMatch) {
        setMatchedProfile(likedProfile)
        setMatchedConversationId(result.conversationId || null)
        setMatchedLikeType(likeType)
        setShowMatch(true)
        setTimeout(() => setShowMatch(false), 5000)
      }
    } catch (error) {
      console.error('Error recording like:', error)
      // Card already advanced; non-blocking (could add toast later)
    } finally {
      setLiking(false)
    }
  }

  const handlePass = () => {
    if (!currentProfile) return
    const passedId = currentProfile.id
    recordPass(user.id, passedId).catch(() => {})
    addPassedUserId(passedId)
    animateCardOut('left', () => loadNextProfile())
  }

  const loadPreviousProfile = () => {
    removeLastPassedUserId()
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
        if (distanceY < -minSwipeDistance) {
          setActivePhotoIndex(prev => (prev + 1) % photos.length)
          touchHandledRef.current = true
        } else if (distanceY > minSwipeDistance) {
          setActivePhotoIndex(prev => (prev - 1 + photos.length) % photos.length)
          touchHandledRef.current = true
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
              loadNextProfile()
              requestAnimationFrame(() => {
                if (cardTrackRef.current) {
                  cardTrackRef.current.style.transition = 'none'
                  cardTrackRef.current.style.transform = 'translateX(0)'
                }
                isAnimatingRef.current = false
              })
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
            <div className="app-loading-logo"><img src="/logos/logo-orange.png" alt="Sapph" /></div>
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

  if (loading || !hasLoaded) {
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
            <div className="nav-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              {unreadCount > 0 && <span className="nav-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </div>
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
        <div className="card-stage card-stage-no-profiles">
          <div className="no-profiles-content">
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
          </div>
        </div>
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
            <div className="nav-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {unreadCount > 0 && <span className="nav-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </div>
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
    showField('pronouns') && filterPreferNotToSay(currentProfile.pronouns).length > 0 && filterPreferNotToSay(currentProfile.pronouns).join('/'),
    showField('gender_identity') && currentProfile.gender_identity,
    showField('sexual_identity') && currentProfile.sexual_identity,
    showField('gender_expression') && currentProfile.gender_expression,
    showField('height') && currentProfile.height,
    showField('location') && currentProfile.location
  ].filter(Boolean)

  const infoLine = infoParts.join(' | ')

  // Construct "Looking For" line
  const lookingForParts = [
    ...(showField('connection_goals') ? filterPreferNotToSay(Array.isArray(currentProfile.connection_goals) ? currentProfile.connection_goals : [currentProfile.connection_goals]) : []),
    ...(showField('relationship_style') ? filterPreferNotToSay(Array.isArray(currentProfile.relationship_style) ? currentProfile.relationship_style : [currentProfile.relationship_style]) : [])
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
      {/* Match Overlay */}
      {showMatch && matchedProfile && (
        <MatchModal
          myPhoto={profile?.photos?.find(u => u.startsWith('http'))}
          theirPhoto={matchedProfile.photos?.find(u => u.startsWith('http'))}
          theirName={matchedProfile.full_name}
          likeType={matchedLikeType}
          conversationId={matchedConversationId}
          onClose={() => setShowMatch(false)}
        />
      )}

      <div className="card-stage">
        <div className="card-track" ref={cardTrackRef}>

          {/* Current profile — full card with all interactive content */}
          <div className="profile-scroll-area">
            <main
              className="profile-card"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchEndCapture={onTouchEndCapture}
            >
              {/* Photo Section */}
              {showField('photos') && (
                <section className="profile-photo-section">
                  {currentProfile.photos?.length > 0 ? (
                    <div className="main-photo-container">
                      {currentProfile.photos.filter(url => url.startsWith('http')).map((url, i) => (
                        <img
                          key={url}
                          src={url}
                          alt={currentProfile.full_name}
                          className={`main-photo${i === activePhotoIndex ? ' active' : ''}`}
                          onClick={(e) => {
                            if (touchHandledRef.current) {
                              touchHandledRef.current = false
                              return
                            }
                            const photos = currentProfile.photos.filter(url => url.startsWith('http'))
                            if (photos.length <= 1) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            const mid = rect.left + rect.width / 2
                            if (e.clientX < mid) {
                              setActivePhotoIndex(prev => (prev - 1 + photos.length) % photos.length)
                            } else {
                              setActivePhotoIndex(prev => (prev + 1) % photos.length)
                            }
                          }}
                        />
                      ))}
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
              {(() => {
                const goals = currentProfile.connection_goals || []
                const showWave  = goals.includes('Friends')
                const showHeart = goals.some(g => g !== 'Friends') || goals.length === 0
                return (
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
                <div className="action-buttons-right">
                {showWave && <button
                  className="action-btn btn-wave"
                  aria-label="Friends"
                  onClick={() => handleLike('friendship')}
                  disabled={liking}
                >
                  <svg viewBox="0 0 1200 1200" fill="currentColor">
                    <path d="m1076.3 829.69c-1.4062-261.47-214.55-473.81-476.29-473.81-262.6 0-476.26 213.66-476.29 476.26 0 3.1875 1.2656 6.2344 3.5156 8.4844s5.2969 3.5156 8.4844 3.5156h254.67c6.6094 0 12-5.3438 12-12 0.09375-108.89 88.734-197.53 197.63-197.53 108.89 0 197.53 88.594 197.58 197.53 0 6.6094 5.3906 12 12 12h254.91c6.6562 0 12-5.3438 12-12 0.046874-0.84375-0.046876-1.6875-0.1875-2.4375zm-850.26-22.453c0.23438-3.2344 0.42188-6.4688 0.75-9.7031 0.28125-3.0469 0.60938-6.0469 0.9375-9.0469 0.375-3.2344 0.75-6.4219 1.2188-9.6094 0.42188-2.9531 0.89062-5.8594 1.3594-8.8125 0.5625-3.1875 1.0781-6.375 1.7344-9.5625 0.5625-2.8594 1.1719-5.7656 1.7812-8.625 0.70312-3.1875 1.4062-6.3281 2.2031-9.4688 0.70312-2.8125 1.4062-5.5781 2.1562-8.3438 0.84375-3.1406 1.7344-6.2344 2.6719-9.3281 0.79688-2.7656 1.6875-5.4375 2.5312-8.1562 0.98438-3.0938 2.0625-6.1875 3.1406-9.2344 0.9375-2.6719 1.9219-5.2969 2.9062-7.9219 1.1719-3.0469 2.3438-6.0938 3.6094-9.0938 1.0781-2.5781 2.1562-5.1562 3.2344-7.6875 1.3125-3 2.6719-5.9531 4.0312-8.9062 1.1719-2.4844 2.3438-4.9688 3.5625-7.4062 1.4531-2.9062 2.9531-5.8125 4.4531-8.7188 1.2656-2.3906 2.5781-4.8281 3.8906-7.2188 1.5938-2.8594 3.2344-5.6719 4.875-8.4844 1.4062-2.3438 2.7656-4.6875 4.2188-6.9844 1.7344-2.7656 3.5156-5.5312 5.2969-8.25 1.5-2.25 2.9531-4.5 4.5-6.75 1.875-2.7188 3.75-5.3438 5.6719-8.0156 1.5938-2.1562 3.1406-4.3125 4.7812-6.4688 1.9688-2.625 4.0312-5.2031 6.0938-7.7344 1.6875-2.0625 3.3281-4.1719 5.0625-6.1875 2.1094-2.5312 4.2656-4.9688 6.4688-7.4531 1.7344-1.9688 3.5156-3.9844 5.2969-5.9531 2.25-2.4375 4.5469-4.7812 6.8438-7.1719 1.8281-1.875 3.7031-3.7969 5.5781-5.6719 2.3438-2.2969 4.7344-4.5938 7.1719-6.8438 1.9219-1.8281 3.8438-3.6562 5.8125-5.3906 2.4375-2.2031 4.9688-4.3594 7.5-6.5156 2.0156-1.6875 4.0312-3.4219 6.0469-5.1094 2.5781-2.1094 5.2031-4.125 7.8281-6.1406 2.1094-1.5938 4.1719-3.2344 6.2812-4.8281 2.6719-1.9688 5.3906-3.8906 8.1094-5.7656 2.1562-1.5 4.3125-3.0469 6.5156-4.5 2.7656-1.8281 5.5781-3.6094 8.3906-5.3906 2.25-1.4062 4.4531-2.8594 6.75-4.2188 2.8594-1.7344 5.7656-3.3281 8.6719-4.9688 2.2969-1.3125 4.5938-2.6719 6.9375-3.8906 2.9531-1.5938 5.9062-3.0469 8.9062-4.5469 2.3906-1.2188 4.7344-2.4375 7.1719-3.6094 3.0469-1.4531 6.0938-2.7656 9.1875-4.1719 2.4375-1.0781 4.8281-2.2031 7.3125-3.2344 3.0938-1.3125 6.2812-2.4844 9.4219-3.75 2.4844-0.9375 4.9688-1.9688 7.4531-2.9062 3.1875-1.1719 6.4219-2.2031 9.6562-3.2812 2.5312-0.84375 5.0625-1.7344 7.6406-2.5312 3.2812-1.0312 6.6562-1.9219 9.9844-2.8125 2.5312-0.70312 5.0625-1.5 7.6406-2.1562 3.4219-0.84375 6.8438-1.5938 10.312-2.3906 2.5781-0.5625 5.1094-1.2188 7.6875-1.7344 3.5156-0.70312 7.125-1.2656 10.641-1.9219 2.5312-0.42188 5.0625-0.9375 7.6406-1.3125 3.7031-0.5625 7.4531-0.98438 11.25-1.4062 2.4375-0.28125 4.875-0.65625 7.3594-0.9375 4.0781-0.42188 8.25-0.65625 12.375-0.9375 2.1562-0.14062 4.3125-0.375 6.4688-0.46875 6.3281-0.32812 12.703-0.46875 19.078-0.46875s12.75 0.1875 19.078 0.46875c2.2031 0.09375 4.3594 0.32812 6.5625 0.46875 4.125 0.28125 8.2031 0.51562 12.281 0.9375 2.5312 0.23438 5.0625 0.65625 7.5938 0.9375 3.6562 0.42188 7.3594 0.84375 10.969 1.4062 2.6719 0.375 5.25 0.9375 7.875 1.3594 3.4688 0.60938 6.9375 1.1719 10.359 1.875 2.6719 0.5625 5.2969 1.2188 7.9219 1.7812 3.3281 0.75 6.7031 1.4531 10.031 2.2969 2.7188 0.70312 5.3438 1.5 8.0156 2.25 3.2344 0.89062 6.4219 1.7344 9.6094 2.7188 2.7188 0.84375 5.3438 1.7812 8.0156 2.6719 3.0938 1.0312 6.1875 2.0156 9.2344 3.1406 2.6719 0.98438 5.2969 2.0625 7.9219 3.0938 2.9531 1.1719 6 2.2969 8.9531 3.5156 2.625 1.125 5.2031 2.2969 7.7812 3.4688 2.9062 1.3125 5.8125 2.5781 8.6719 3.9375 2.5781 1.2188 5.0625 2.5312 7.5938 3.7969 2.8125 1.4062 5.6719 2.8125 8.4375 4.3125 2.5312 1.3594 4.9688 2.7656 7.4531 4.1719 2.7188 1.5469 5.4375 3.0938 8.1562 4.6875 2.4375 1.4531 4.8281 3.0469 7.2656 4.5469 2.625 1.6406 5.25 3.2812 7.8281 5.0156 2.3906 1.5938 4.6875 3.2344 7.0312 4.875 2.5312 1.7812 5.1094 3.5625 7.5938 5.3906 2.2969 1.6875 4.5469 3.4688 6.7969 5.2031 2.4375 1.875 4.9219 3.7969 7.3125 5.7656 2.2031 1.7812 4.3594 3.6562 6.5156 5.4844 2.3438 2.0156 4.7344 4.0312 7.0781 6.0938 2.1094 1.875 4.1719 3.8438 6.2344 5.7656 2.25 2.1094 4.5469 4.2656 6.75 6.4219 2.0156 1.9688 3.9844 4.0312 5.9531 6.0938 2.1562 2.25 4.3125 4.4531 6.4219 6.75 1.9219 2.0625 3.7969 4.2188 5.6719 6.3281 2.0625 2.3438 4.125 4.6875 6.1406 7.0312 1.8281 2.1562 3.6094 4.4062 5.3906 6.6094 1.9219 2.4375 3.8438 4.8281 5.7656 7.3125 1.7344 2.25 3.4219 4.5938 5.1094 6.8906 1.8281 2.5312 3.6562 5.0156 5.3906 7.5938 1.6406 2.3438 3.1875 4.7344 4.7812 7.125 1.6875 2.5781 3.375 5.2031 5.0625 7.8281 1.5 2.4375 2.9531 4.875 4.4531 7.3594 1.5938 2.6719 3.1406 5.3438 4.6875 8.1094 1.4062 2.4844 2.7656 5.0156 4.0781 7.5938 1.4531 2.7656 2.8594 5.5312 4.2656 8.2969 1.2656 2.5781 2.5312 5.2031 3.75 7.8281 1.3125 2.8125 2.625 5.6719 3.8438 8.5312 1.1719 2.6719 2.2969 5.3438 3.4219 8.0625 1.1719 2.8594 2.2969 5.7656 3.4219 8.6719 1.0312 2.7656 2.0625 5.5312 3.0469 8.2969 1.0312 2.9062 2.0156 5.8594 3 8.8594 0.89062 2.8125 1.7812 5.625 2.6719 8.4844 0.89062 3 1.7344 6 2.5781 9.0469 0.79688 2.8594 1.5469 5.7656 2.25 8.6719 0.75 3.0469 1.4531 6.0938 2.1094 9.1875 0.65625 2.9531 1.2656 5.9062 1.8281 8.8594 0.60938 3.0469 1.125 6.1406 1.6406 9.2344 0.51562 3.0469 1.0312 6.0938 1.4531 9.1406 0.42188 3.0938 0.79688 6.1875 1.1719 9.2812s0.70312 6.2344 0.98438 9.3281 0.51562 6.2344 0.75 9.3281c0.23438 3.1875 0.42188 6.375 0.5625 9.6094 0.046875 1.1719 0.046875 2.3438 0.09375 3.5156h-63.469c-0.046875-1.0781-0.14062-2.1562-0.1875-3.2344-0.14062-2.5312-0.28125-5.0156-0.46875-7.5469-0.1875-2.7188-0.42188-5.3906-0.70312-8.1094-0.23438-2.4375-0.51562-4.875-0.84375-7.3125-0.32812-2.7188-0.70312-5.4375-1.0781-8.1094-0.32812-2.3438-0.75-4.7344-1.1719-7.0781-0.46875-2.7188-0.98438-5.4375-1.5469-8.1562-0.46875-2.25-0.9375-4.5469-1.4531-6.7969-0.60938-2.7188-1.2656-5.3906-1.9219-8.1094-0.5625-2.2031-1.125-4.3594-1.7344-6.5625-0.75-2.7188-1.5469-5.3906-2.3438-8.1094-0.65625-2.1094-1.3125-4.2188-2.0156-6.3281-0.89062-2.7188-1.8281-5.3438-2.7656-8.0625-0.75-2.0625-1.5-4.0781-2.25-6.0938-1.0312-2.6719-2.1094-5.2969-3.1875-7.9219-0.79688-1.9688-1.6406-3.8906-2.5312-5.8594-1.1719-2.6719-2.3906-5.25-3.6094-7.875-0.89062-1.875-1.7812-3.7031-2.7188-5.5781-1.3125-2.625-2.6719-5.2031-4.0312-7.7812-0.9375-1.7812-1.9219-3.5625-2.9062-5.3438-1.4062-2.5781-2.9062-5.1094-4.4062-7.5938-1.0312-1.7344-2.0625-3.4688-3.1406-5.1562-1.5938-2.5312-3.1875-4.9688-4.8281-7.4062-1.125-1.6406-2.2031-3.2812-3.3281-4.9219-1.6875-2.4375-3.4219-4.8281-5.2031-7.2188-1.1719-1.5938-2.2969-3.1875-3.5156-4.7344-1.7812-2.3438-3.6562-4.6875-5.5312-6.9844-1.2188-1.5469-2.4375-3.0469-3.7031-4.5469-1.9219-2.25-3.8906-4.5-5.8594-6.7031-1.2656-1.4531-2.5781-2.9062-3.8906-4.3125-2.0156-2.2031-4.125-4.3125-6.1875-6.4688-1.3594-1.3594-2.7188-2.7656-4.0781-4.125-2.1562-2.1094-4.3125-4.125-6.5156-6.1875-1.4062-1.3125-2.8125-2.625-4.2656-3.9375-2.25-1.9688-4.5-3.9375-6.7969-5.8594-1.5-1.2656-2.9531-2.5312-4.4531-3.75-2.2969-1.875-4.6875-3.7031-7.0781-5.5312-1.5469-1.1719-3.0938-2.3906-4.6406-3.5156-2.3906-1.7812-4.8281-3.4688-7.3125-5.1562-1.6406-1.125-3.2344-2.25-4.8281-3.3281-2.4844-1.6406-5.0156-3.2344-7.5469-4.8281-1.6875-1.0312-3.3281-2.1094-5.0156-3.1406-2.5312-1.5469-5.1562-2.9531-7.7344-4.4531-1.7344-0.98438-3.4219-1.9688-5.2031-2.9062-2.625-1.4062-5.25-2.7188-7.9219-4.0312-1.7812-0.89062-3.5625-1.8281-5.3906-2.7188-2.6719-1.2656-5.3438-2.4375-8.0625-3.6562-1.875-0.79688-3.7031-1.6875-5.5781-2.4375-2.7188-1.125-5.4844-2.2031-8.25-3.2344-1.9219-0.75-3.8438-1.5-5.7656-2.2031-2.7656-0.98438-5.5781-1.875-8.3438-2.8125-1.9688-0.65625-3.9375-1.3594-5.9531-1.9688-2.8125-0.84375-5.7188-1.6406-8.5781-2.4375-2.0156-0.5625-4.0312-1.1719-6.0469-1.6875-2.9062-0.75-5.8125-1.3594-8.7656-2.0156-2.0625-0.46875-4.0781-0.9375-6.1406-1.3594-2.9531-0.60938-6-1.0781-9-1.5938-2.0625-0.32812-4.0781-0.75-6.1406-1.0781-3.0938-0.46875-6.2344-0.79688-9.375-1.2188-1.9688-0.23438-3.9375-0.5625-5.9531-0.75-3.4219-0.32812-6.8438-0.5625-10.266-0.79688-1.7812-0.14062-3.5156-0.28125-5.2969-0.375-5.25-0.28125-10.5-0.375-15.75-0.375-5.2969 0-10.594 0.14062-15.797 0.375-1.7812 0.09375-3.5625 0.28125-5.3438 0.375-3.4219 0.23438-6.8906 0.42188-10.312 0.79688-2.0156 0.1875-3.9844 0.51562-6 0.75-3.1406 0.375-6.2812 0.75-9.375 1.2188-2.1094 0.32812-4.2188 0.75-6.2812 1.125-2.9531 0.51562-5.9062 0.98438-8.8594 1.5938-2.1562 0.42188-4.3125 0.98438-6.4688 1.4531-2.8125 0.65625-5.6719 1.2656-8.4375 1.9688-2.1562 0.5625-4.2656 1.1719-6.375 1.7812-2.7656 0.75-5.5312 1.5-8.25 2.3438-2.1094 0.65625-4.2188 1.3594-6.2812 2.0625-2.6719 0.89062-5.3906 1.7344-8.0156 2.7188-2.0625 0.75-4.125 1.5938-6.1875 2.3906-2.625 1.0312-5.25 2.0156-7.8281 3.0938-2.0625 0.84375-4.0312 1.7812-6.0938 2.6719-2.5312 1.125-5.1094 2.25-7.5938 3.4219-1.9688 0.9375-3.9375 1.9688-5.9062 2.9531-2.4844 1.2656-4.9688 2.4844-7.4062 3.7969-1.9219 1.0312-3.8438 2.1562-5.7188 3.2344-2.4375 1.3594-4.8281 2.7188-7.2188 4.1719-1.875 1.125-3.7031 2.2969-5.5781 3.4688-2.3438 1.4531-4.6875 2.9531-6.9844 4.5-1.8281 1.2188-3.6094 2.4844-5.3906 3.7031-2.25 1.5938-4.5469 3.1875-6.75 4.8281-1.7344 1.2656-3.4688 2.625-5.2031 3.9375-2.2031 1.6875-4.3594 3.375-6.5156 5.1094-1.6875 1.3594-3.3281 2.7656-4.9688 4.1719-2.1094 1.7812-4.2188 3.6094-6.2812 5.4375-1.5938 1.4531-3.1875 2.9062-4.7812 4.4062-2.0156 1.875-4.0312 3.7969-6 5.7188-1.5469 1.5-3.0469 3.0469-4.5469 4.5938-1.9219 1.9688-3.8438 3.9844-5.7188 6-1.4531 1.5938-2.9062 3.2344-4.3594 4.8281-1.8281 2.0625-3.6562 4.1719-5.4375 6.2344-1.4062 1.6875-2.7656 3.3281-4.125 5.0625-1.7344 2.1562-3.4219 4.3125-5.1094 6.5156-1.3125 1.7344-2.625 3.4688-3.8906 5.25-1.6406 2.25-3.2344 4.4531-4.7812 6.75-1.2656 1.7812-2.4844 3.6094-3.6562 5.4375-1.5469 2.2969-3.0469 4.6406-4.5 6.9844-1.1719 1.8281-2.2969 3.7031-3.4219 5.625-1.4062 2.3438-2.7656 4.7812-4.125 7.1719-1.0781 1.9219-2.1562 3.8438-3.1875 5.8125-1.2656 2.4375-2.5312 4.875-3.75 7.3125-0.98438 2.0156-1.9688 4.0312-2.9062 6.0469-1.1719 2.4844-2.2969 4.9688-3.375 7.5-0.89062 2.0625-1.7812 4.125-2.6719 6.2344-1.0312 2.5312-2.0625 5.0625-3.0469 7.6406-0.79688 2.1562-1.6406 4.2656-2.3906 6.4219-0.9375 2.5781-1.7812 5.1562-2.625 7.7812-0.70312 2.2031-1.4531 4.4062-2.1094 6.6094-0.79688 2.625-1.5 5.2031-2.25 7.8281-0.60938 2.25-1.2656 4.5469-1.8281 6.8438-0.65625 2.625-1.2656 5.2969-1.8281 7.9219-0.51562 2.2969-1.0312 4.6406-1.5 7.0312-0.51562 2.6719-0.98438 5.2969-1.4531 7.9688-0.42188 2.3906-0.84375 4.7812-1.1719 7.2188-0.375 2.6719-0.70312 5.3438-1.0312 8.0156-0.28125 2.4375-0.60938 4.9219-0.84375 7.4062-0.23438 2.6719-0.42188 5.3906-0.60938 8.0625-0.1875 2.5312-0.375 5.0625-0.46875 7.5938l-0.14062 1.9688h-63.422c0.046875-1.2188 0.046875-2.4375 0.09375-3.6562-0.1875-2.625 0-5.6719 0.23438-8.7188zm373.97-196.64c-118.12 0-214.97 92.906-221.26 209.53h-65.859c0-0.46875 0-0.9375 0.046876-1.3594 0.09375-2.3438 0.28125-4.6406 0.46875-6.9375 0.1875-2.4844 0.32812-4.9688 0.5625-7.4062 0.23437-2.3438 0.51562-4.6406 0.79687-6.9375 0.28125-2.4375 0.5625-4.8281 0.9375-7.2656 0.32813-2.2969 0.75-4.5938 1.1719-6.8906 0.42187-2.3438 0.79687-4.7344 1.2656-7.0781 0.46875-2.2969 0.98438-4.5469 1.5-6.7969 0.51563-2.2969 1.0312-4.6406 1.5938-6.9375 0.5625-2.25 1.2188-4.5 1.8281-6.75 0.60937-2.25 1.2656-4.5 1.9219-6.75 0.65625-2.2031 1.4062-4.4062 2.1562-6.6094s1.4531-4.4062 2.25-6.6094c0.79688-2.2031 1.5938-4.3594 2.4375-6.5156s1.6406-4.2656 2.5312-6.4219c0.89063-2.1562 1.8281-4.2656 2.7656-6.375s1.875-4.1719 2.8125-6.2344c0.98437-2.1094 2.0156-4.1719 3.0469-6.2344s2.0625-4.0781 3.1406-6.0938c1.0781-2.0156 2.2031-4.0312 3.3281-6.0469l3.375-5.9062c1.1719-1.9688 2.3906-3.9375 3.6094-5.9062 1.2188-1.9219 2.4375-3.7969 3.6562-5.7188 1.2656-1.9219 2.5781-3.7969 3.8438-5.7188 1.2656-1.8281 2.5781-3.7031 3.9375-5.5312 1.3594-1.8281 2.7188-3.7031 4.125-5.5312 1.3594-1.7812 2.7656-3.5625 4.1719-5.2969 1.4531-1.7812 2.9062-3.5625 4.3594-5.2969 1.4531-1.7344 2.9062-3.4219 4.4062-5.1094 1.5-1.7344 3.0469-3.4219 4.5938-5.1094 1.5469-1.6406 3.0938-3.2812 4.6875-4.875 1.5938-1.6406 3.1875-3.2344 4.8281-4.8281 1.6406-1.5938 3.2812-3.1406 4.9219-4.6875 1.6875-1.5469 3.3281-3.0938 5.0156-4.5938s3.4219-3 5.1562-4.4531c1.7344-1.4531 3.4688-2.9062 5.2031-4.3594 1.7812-1.4531 3.5625-2.8125 5.3906-4.2188 1.7812-1.3594 3.5625-2.7656 5.3906-4.125 1.8281-1.3594 3.75-2.6719 5.625-3.9844 1.8281-1.2656 3.7031-2.5781 5.5781-3.8438 1.9219-1.2656 3.8906-2.5312 5.8125-3.75 1.9219-1.2188 3.7969-2.3906 5.7188-3.5625 2.0156-1.2188 4.0312-2.3438 6.0469-3.4688 1.9219-1.125 3.8906-2.2031 5.8594-3.2812 2.0625-1.125 4.1719-2.1562 6.2812-3.2344 1.9688-0.98438 3.9844-2.0156 6-2.9531 2.1562-1.0312 4.3125-1.9688 6.4688-2.9531 2.0156-0.89062 4.0781-1.8281 6.0938-2.6719 2.2031-0.9375 4.4531-1.7812 6.7031-2.6719 2.0625-0.79688 4.125-1.6406 6.1875-2.3906 2.2969-0.84375 4.6406-1.5938 6.9375-2.3438 2.0625-0.70312 4.1719-1.4062 6.2344-2.0625 2.3906-0.75 4.7812-1.3594 7.1719-2.0625 2.1094-0.60938 4.1719-1.2188 6.2812-1.7344 2.4844-0.65625 5.0156-1.1719 7.5469-1.7344 2.0625-0.46875 4.125-0.98438 6.1875-1.4062 2.6719-0.5625 5.3438-0.98438 8.0156-1.4531 1.9688-0.32812 3.9375-0.75 5.9531-1.0312 2.8125-0.42188 5.7188-0.75 8.5312-1.0781 1.875-0.23438 3.75-0.51562 5.6719-0.70312 3.1406-0.32812 6.2812-0.51562 9.4219-0.70312 1.6406-0.09375 3.2812-0.28125 4.9688-0.375 4.8281-0.23438 9.7031-0.375 14.578-0.375s9.75 0.14062 14.578 0.375c1.6875 0.09375 3.2812 0.23438 4.9219 0.375 3.1875 0.23438 6.3281 0.42188 9.4688 0.70312 1.875 0.1875 3.75 0.46875 5.625 0.70312 2.8594 0.32812 5.7656 0.65625 8.5781 1.0781 1.9688 0.28125 3.9375 0.70312 5.9062 1.0312 2.7188 0.46875 5.3906 0.89062 8.0625 1.4531 2.0625 0.42188 4.0781 0.89062 6.0938 1.3594 2.5312 0.5625 5.1094 1.125 7.6406 1.7812 2.0625 0.51562 4.125 1.125 6.1875 1.7344 2.4375 0.70312 4.875 1.3125 7.2656 2.0625 2.0625 0.65625 4.125 1.3594 6.1875 2.0156 2.3438 0.79688 4.7344 1.5469 7.0312 2.3906 2.0625 0.75 4.0781 1.5469 6.0938 2.3438 2.25 0.89062 4.5469 1.7344 6.7969 2.6719 2.0156 0.84375 4.0312 1.7344 6 2.625 2.2031 0.98438 4.4062 1.9688 6.6094 3 1.9688 0.9375 3.8906 1.9219 5.8594 2.9062 2.1562 1.0781 4.3125 2.1562 6.4219 3.2812 1.9219 1.0312 3.7969 2.1094 5.7188 3.1875 2.0625 1.1719 4.1719 2.3438 6.1875 3.5625 1.875 1.125 3.75 2.2969 5.5781 3.4688 2.0156 1.2656 4.0312 2.5312 5.9531 3.8438 1.8281 1.2188 3.6562 2.4844 5.4375 3.75 1.9219 1.3594 3.8438 2.7188 5.7656 4.0781 1.7812 1.3125 3.5156 2.6719 5.25 4.0312 1.8281 1.4062 3.7031 2.8594 5.5312 4.3125 1.7344 1.4062 3.4219 2.8125 5.1094 4.2656 1.7812 1.5 3.5625 3 5.25 4.5469 1.6406 1.4531 3.2812 3 4.875 4.5 1.6875 1.5938 3.375 3.1875 5.0625 4.8281 1.5938 1.5469 3.1406 3.1406 4.6875 4.7344 1.6406 1.6875 3.2344 3.3281 4.8281 5.0625 1.5 1.6406 2.9531 3.2812 4.4531 4.9219 1.5469 1.7344 3.0938 3.5156 4.5938 5.2969 1.4062 1.6875 2.8125 3.4219 4.2188 5.1562 1.4531 1.8281 2.9062 3.6562 4.3125 5.4844 1.3594 1.7344 2.6719 3.5625 3.9844 5.3438 1.3594 1.875 2.7188 3.7969 4.0781 5.7188 1.2656 1.8281 2.5312 3.6562 3.75 5.4844 1.2656 1.9688 2.5781 3.9375 3.7969 5.9062 1.1719 1.875 2.3438 3.7969 3.4688 5.7188 1.2188 2.0156 2.3438 4.0781 3.5156 6.0938 1.0781 1.9219 2.1562 3.8906 3.2344 5.8594 1.125 2.1094 2.2031 4.2188 3.2344 6.2812 0.98438 1.9688 1.9688 3.9844 2.9062 5.9531 1.0312 2.1562 1.9688 4.3125 2.9531 6.5156 0.89062 2.0156 1.7812 4.0781 2.625 6.0938 0.9375 2.2031 1.7812 4.4531 2.6719 6.7031 0.79688 2.0625 1.5938 4.125 2.3438 6.2344 0.79688 2.25 1.5938 4.5938 2.3438 6.8906 0.70313 2.1094 1.3594 4.1719 2.0156 6.2812 0.70312 2.3438 1.3594 4.7344 2.0156 7.125 0.60938 2.1094 1.1719 4.2188 1.7344 6.3281 0.60937 2.4375 1.1719 4.9219 1.7344 7.3594 0.46875 2.1094 0.9375 4.2188 1.3594 6.3281 0.51562 2.5312 0.9375 5.0625 1.3594 7.5938 0.375 2.1094 0.75 4.2656 1.0781 6.375 0.375 2.625 0.70312 5.25 1.0312 7.875 0.23437 2.1094 0.51562 4.2188 0.75 6.2812 0.23437 2.7188 0.42187 5.4844 0.60937 8.25 0.14063 2.0625 0.32813 4.125 0.42188 6.1875 0.046874 0.51562 0.046874 1.0312 0.046874 1.5469h-65.812c-6.4688-116.48-103.27-209.44-221.39-209.44zm398.76 209.53c-0.046875-1.3594-0.1875-2.7656-0.23438-4.125-0.14062-3.4219-0.32812-6.8438-0.5625-10.266-0.23438-3.2812-0.46875-6.5625-0.75-9.8438-0.28125-3.375-0.65625-6.75-1.0781-10.078-0.375-3.2344-0.79688-6.5156-1.2656-9.75-0.46875-3.3281-0.98438-6.6094-1.5469-9.8906-0.5625-3.2344-1.125-6.4219-1.7344-9.6094-0.65625-3.2344-1.3125-6.5156-2.0156-9.75-0.70312-3.1875-1.4062-6.2812-2.2031-9.4219-0.79688-3.2344-1.6406-6.4219-2.4844-9.6094-0.84375-3.0938-1.7344-6.1875-2.625-9.2344-0.9375-3.1406-1.9219-6.2812-2.9062-9.375-0.98438-3.0469-2.0156-6.0938-3.0938-9.0938-1.0781-3.0938-2.2031-6.1406-3.3281-9.1406s-2.2969-5.9531-3.5156-8.9062c-1.2188-3-2.4375-5.9531-3.75-8.9062-1.2656-2.9062-2.5781-5.8125-3.9375-8.7188s-2.7188-5.8125-4.1719-8.7188c-1.4062-2.8594-2.8594-5.6719-4.3594-8.4375-1.5-2.8125-3-5.6719-4.5469-8.4844-1.5469-2.7656-3.1406-5.5312-4.7344-8.25-1.6406-2.7656-3.2344-5.4844-4.9219-8.2031s-3.4219-5.3438-5.1562-8.0156-3.4688-5.2969-5.25-7.9219-3.6562-5.2031-5.5312-7.7344c-1.8281-2.5781-3.7031-5.1094-5.625-7.6406s-3.8906-5.0156-5.9062-7.5c-1.9688-2.4375-3.9375-4.9219-5.9531-7.3125-2.0625-2.4375-4.1719-4.8281-6.2344-7.2188-2.0625-2.3438-4.1719-4.7344-6.2812-7.0312-2.1562-2.3438-4.3594-4.6406-6.6094-6.9375-2.2031-2.25-4.3594-4.5-6.6094-6.7031-2.2969-2.25-4.5938-4.4062-6.9375-6.6094-2.2969-2.1562-4.5469-4.3125-6.8906-6.375-2.3906-2.1562-4.8281-4.2188-7.2656-6.2812-2.3906-2.0156-4.7344-4.0781-7.1719-6.0469-2.4844-2.0625-5.0625-3.9844-7.5938-5.9531-2.4375-1.9219-4.875-3.8438-7.4062-5.6719-2.625-1.9219-5.25-3.75-7.9219-5.625-2.5312-1.7812-5.0625-3.6094-7.6406-5.2969-2.7188-1.8281-5.4375-3.5156-8.2031-5.25-2.625-1.6406-5.2031-3.3281-7.875-4.9219-2.8125-1.6875-5.7188-3.2812-8.5781-4.9219-2.6719-1.5-5.2969-3.0938-8.0156-4.5469-2.9062-1.5938-5.9062-3.0469-8.9062-4.5469-2.7188-1.3594-5.4375-2.7656-8.2031-4.125-3.0469-1.4531-6.0938-2.7656-9.1875-4.1719-2.7656-1.2656-5.5781-2.5312-8.3438-3.7031-3.0938-1.3125-6.2344-2.4844-9.375-3.7031-2.8594-1.125-5.7188-2.25-8.5781-3.3281-3.2344-1.1719-6.4688-2.2031-9.75-3.2812-2.8594-0.9375-5.7188-1.9688-8.625-2.8594-3.3281-1.0312-6.75-1.9219-10.172-2.8594-2.8594-0.79688-5.7188-1.6875-8.625-2.3906-3.4688-0.89062-7.0312-1.6406-10.547-2.4375-2.8594-0.65625-5.6719-1.3594-8.5781-1.9219-3.7031-0.75-7.4062-1.3594-11.109-1.9688-2.7656-0.46875-5.5312-1.0312-8.3438-1.4531-3.8906-0.60938-7.875-1.0312-11.812-1.5-2.6719-0.32812-5.2969-0.75-7.9688-0.98438-4.4531-0.42188-8.9062-0.70312-13.406-1.0312-2.2031-0.14062-4.4062-0.375-6.6094-0.51562-6.75-0.32812-13.5-0.51562-20.297-0.51562s-13.594 0.1875-20.297 0.51562c-2.2031 0.09375-4.4062 0.32812-6.6094 0.46875-4.5 0.28125-9 0.5625-13.453 1.0312-2.6719 0.28125-5.25 0.65625-7.875 0.98438-3.9844 0.46875-7.9219 0.9375-11.859 1.5-2.8125 0.42188-5.5781 0.98438-8.3438 1.4531-3.7031 0.65625-7.4531 1.2656-11.109 1.9688-2.9062 0.60938-5.7188 1.3125-8.5781 1.9219-3.5156 0.79688-7.0312 1.5469-10.547 2.4375-2.9062 0.75-5.7188 1.5938-8.5781 2.3906-3.375 0.9375-6.7969 1.875-10.172 2.9062-2.8594 0.89062-5.7188 1.875-8.5781 2.8594-3.2812 1.0781-6.5625 2.1562-9.7969 3.3281-2.8594 1.0312-5.6719 2.2031-8.4844 3.2812-3.1875 1.2188-6.375 2.4375-9.4688 3.75-2.8125 1.1719-5.5312 2.4375-8.2969 3.7031-3.0938 1.3594-6.1875 2.7188-9.2344 4.1719-2.7188 1.3125-5.3906 2.7188-8.1094 4.0781-3 1.5-6 3-8.9531 4.5938-2.6719 1.4531-5.2969 2.9531-7.9219 4.4531-2.9062 1.6406-5.8125 3.2812-8.625 4.9688-2.625 1.5938-5.2031 3.2344-7.7812 4.875-2.7656 1.7812-5.5781 3.5156-8.2969 5.3438-2.5312 1.6875-5.0625 3.4688-7.5469 5.25-2.6719 1.875-5.3906 3.75-8.0156 5.7188-2.4844 1.8281-4.875 3.75-7.3125 5.625-2.5781 2.0156-5.1562 3.9844-7.6875 6.0469-2.3906 1.9688-4.7344 3.9844-7.0781 5.9531-2.4375 2.1094-4.9219 4.2188-7.3594 6.375-2.2969 2.0625-4.5469 4.2188-6.7969 6.3281-2.3438 2.2031-4.6875 4.4062-7.0312 6.7031-2.2031 2.2031-4.3594 4.4062-6.5156 6.6562-2.25 2.2969-4.5 4.6406-6.6562 6.9844-2.1094 2.2969-4.1719 4.6406-6.2344 6.9375-2.1094 2.4375-4.2656 4.8281-6.3281 7.3125-2.0156 2.3906-3.9375 4.8281-5.9062 7.2656-2.0156 2.4844-3.9844 5.0156-5.9531 7.5469-1.9219 2.4844-3.75 5.0625-5.625 7.5938-1.875 2.5781-3.75 5.1562-5.5781 7.7812-1.7812 2.625-3.5156 5.25-5.25 7.875-1.7344 2.6719-3.4688 5.3438-5.2031 8.0625-1.6406 2.6719-3.2812 5.3906-4.875 8.1094-1.6406 2.7656-3.2344 5.5312-4.8281 8.3438-1.5469 2.7656-3.0469 5.5312-4.5 8.3438-1.5 2.8594-2.9531 5.7188-4.4062 8.5781-1.4062 2.8125-2.7656 5.7188-4.125 8.5781-1.3594 2.9062-2.7188 5.8594-3.9844 8.8125-1.2656 2.9062-2.4844 5.8594-3.7031 8.8125-1.2188 3-2.4375 6-3.5625 9.0469-1.125 3-2.25 6-3.2812 9.0469-1.0781 3.0469-2.1094 6.1406-3.1406 9.2344-0.98438 3.0938-1.9688 6.1406-2.8594 9.2344-0.9375 3.1406-1.8281 6.2344-2.6719 9.375s-1.6406 6.2812-2.4375 9.4219c-0.79688 3.1875-1.5 6.375-2.2031 9.6094-0.70312 3.1875-1.3594 6.375-1.9688 9.6094s-1.2188 6.5156-1.7344 9.75c-0.5625 3.2344-1.0312 6.4688-1.5 9.75s-0.89062 6.6094-1.2656 9.9375c-0.375 3.2812-0.75 6.5625-1.0312 9.8906s-0.5625 6.7031-0.75 10.078c-0.23438 3.3281-0.42188 6.6562-0.5625 10.031-0.046875 1.4062-0.1875 2.8125-0.23438 4.2656h-53.391c6.4688-244.08 206.81-440.48 452.16-440.48s445.69 196.4 452.16 440.21z"/>
                  </svg>
                </button>}
                {showHeart && <button
                  className="action-btn btn-like"
                  aria-label="Like"
                  onClick={() => handleLike('heart')}
                  disabled={liking}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>}
                </div>
              </div>
                )
              })()}

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

                  {/* About Me Section - Category Style */}
                  <div className="profile-section">
                    <h3 className="section-header">ABOUT ME:</h3>

                    {/* WORK & LIFE */}
                    {((showField('job_title') && currentProfile.job_title) ||
                      (showField('location') && currentProfile.location) ||
                      (showField('hometown') && currentProfile.hometown) ||
                      (showField('pets') && currentProfile.pets && currentProfile.pets.length > 0)) && (
                      <div className="about-me-category">
                        <h4 className="section-header">WORK & LIFE</h4>
                        <div className="category-items">
                          {showField('job_title') && currentProfile.job_title && (
                            <span className="category-item">
                              <span className="category-label-inline">Job</span>
                              <span className="category-value">{currentProfile.job_title}</span>
                            </span>
                          )}
                          {showField('location') && currentProfile.location && (
                            <span className="category-item">
                              <span className="category-label-inline">Lives in</span>
                              <span className="category-value">{currentProfile.location}</span>
                            </span>
                          )}
                          {showField('hometown') && currentProfile.hometown && (
                            <span className="category-item">
                              <span className="category-label-inline">From</span>
                              <span className="category-value">{currentProfile.hometown}</span>
                            </span>
                          )}
                          {showField('pets') && currentProfile.pets && currentProfile.pets.length > 0 && (
                            <span className="category-item">
                              <span className="category-label-inline">Pets</span>
                              <span className="category-value">{(Array.isArray(currentProfile.pets) ? currentProfile.pets : [currentProfile.pets]).join(', ')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* IDENTITY */}
                    {((showField('height') && currentProfile.height) ||
                      (showField('children') && currentProfile.children && currentProfile.children !== 'Prefer not to say') ||
                      (showField('political_alignment') && currentProfile.political_alignment && currentProfile.political_alignment !== 'Prefer not to say' && currentProfile.political_alignment !== 'Prefer not to share') ||
                      (showField('zodiac_sign') && currentProfile.zodiac_sign)) && (
                      <div className="about-me-category">
                        <h4 className="section-header">IDENTITY</h4>
                        <div className="category-items">
                          {showField('height') && currentProfile.height && (
                            <span className="category-item">
                              <span className="category-label-inline">Height</span>
                              <span className="category-value">{currentProfile.height}</span>
                            </span>
                          )}
                          {showField('children') && currentProfile.children && currentProfile.children !== 'Prefer not to say' && (
                            <span className="category-item">
                              <span className="category-label-inline">Family plans</span>
                              <span className="category-value">{currentProfile.children}</span>
                            </span>
                          )}
                          {showField('political_alignment') && currentProfile.political_alignment
                            && currentProfile.political_alignment !== 'Prefer not to say'
                            && currentProfile.political_alignment !== 'Prefer not to share' && (
                            <span className="category-item">
                              <span className="category-label-inline">Politics</span>
                              <span className="category-value">{displayPolitical(currentProfile.political_alignment)}</span>
                            </span>
                          )}
                          {showField('zodiac_sign') && currentProfile.zodiac_sign && (
                            <span className="category-item">
                              <span className="category-label-inline">Zodiac</span>
                              <span className="category-value">{currentProfile.zodiac_sign}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vices Section - Category Style */}
                  {(showField('smoking') || showField('drinking') || showField('marijuana') || showField('drugs')) && 
                   (currentProfile.smoking || currentProfile.drinking || currentProfile.marijuana || currentProfile.drugs) && (
                    <div className="profile-section">
                      <h3 className="section-header">VICES:</h3>
                      <div className="about-me-category">
                        <div className="category-items">
                          {showField('smoking') && currentProfile.smoking && (
                            <span className="category-item">
                              <span className="category-label-inline">Smoke</span>
                              <span className="category-value">{currentProfile.smoking}</span>
                            </span>
                          )}
                          {showField('drinking') && currentProfile.drinking && (
                            <span className="category-item">
                              <span className="category-label-inline">Drink</span>
                              <span className="category-value">{currentProfile.drinking}</span>
                            </span>
                          )}
                          {showField('marijuana') && currentProfile.marijuana && (
                            <span className="category-item">
                              <span className="category-label-inline">Weed</span>
                              <span className="category-value">{currentProfile.marijuana}</span>
                            </span>
                          )}
                          {showField('drugs') && currentProfile.drugs && (
                            <span className="category-item">
                              <span className="category-label-inline">Other drugs</span>
                              <span className="category-value">{currentProfile.drugs}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Intimate Section - Category Style */}
                  {(showField('sex_preferences') || showField('kinks')) && 
                   (filterPreferNotToSay(currentProfile.sex_preferences).length > 0 || filterPreferNotToSay(currentProfile.kinks).length > 0) && (
                    <div className="profile-section">
                      <h3 className="section-header">INTIMACY:</h3>
                      <div className="about-me-category">
                        <div className="category-items">
                          {showField('sex_preferences') && filterPreferNotToSay(currentProfile.sex_preferences).length > 0 && (
                            <span className="category-item">
                              <span className="category-label-inline">Sex preference</span>
                              <span className="category-value">{filterPreferNotToSay(currentProfile.sex_preferences).join(', ')}</span>
                            </span>
                          )}
                          {showField('kinks') && filterPreferNotToSay(currentProfile.kinks).length > 0 && (
                            <span className="category-item">
                              <span className="category-label-inline">Kinks</span>
                              <span className="category-value">{filterPreferNotToSay(currentProfile.kinks).join(', ')}</span>
                            </span>
                          )}
                        </div>
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
                  className="next-card-photo"
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
          <div className="nav-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {unreadCount > 0 && <span className="nav-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </div>
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
