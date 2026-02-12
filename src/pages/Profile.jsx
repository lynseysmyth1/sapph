import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Profile.css'

export default function Profile() {
  const { profile } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  if (!profile) {
    return (
      <div className="profile-loading">
        <div>
          <p>Loading your profile…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <main className="profile-card">
        {/* Profile Header Section - Large image on left, name and buttons stacked on right */}
        <section className="profile-header-section">
          <div className="profile-header-image-row">
            <div className="profile-thumbnail-wrapper">
              {profile.photos?.length > 0 ? (
                <img
                  src={profile.photos.filter(url => url.startsWith('http'))[0]}
                  alt={profile.full_name}
                  className="profile-header-thumbnail"
                />
              ) : (
                <div className="profile-header-thumbnail-placeholder">
                  {profile.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="profile-header-right">
              <h1 className="profile-header-name">{profile.full_name}</h1>
              <div className="profile-header-actions">
                <Link to="/onboarding" className="profile-header-btn edit-btn">
                  Edit Profile
                </Link>
                <Link to="/preview-profile" className="profile-header-btn preview-btn">
                  Preview Profile
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Content Section */}
        <section className="profile-content">
          {/* Matching Preferences Section */}
          <div className="matching-preferences-section">
            <h2 className="matching-preferences-heading">MATCHING PREFERENCES</h2>
            <div className="matching-preferences-list">
              <Link to="/preferences/age-range" className="matching-preference-item">
                <span className="preference-label">Age Range</span>
                <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
              <Link to="/preferences/distance" className="matching-preference-item">
                <span className="preference-label">Distance</span>
                <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
              <Link to="/preferences/gender" className="matching-preference-item">
                <span className="preference-label">Gender</span>
                <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
              <Link to="/preferences/relationship-goals" className="matching-preference-item">
                <span className="preference-label">Relationship Goals</span>
                <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
              <Link to="/preferences/connection-goals" className="matching-preference-item">
                <span className="preference-label">Connection Goals</span>
                <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
              <Link to="/preferences/relationship-style" className="matching-preference-item">
                <span className="preference-label">Relationship Style</span>
                <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
              <Link to="/preferences/family-plans" className="matching-preference-item">
                <span className="preference-label">Family Plans</span>
                <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
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
