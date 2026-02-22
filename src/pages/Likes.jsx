import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUsersWhoLikedMe, getMutualMatches } from '../lib/discoveryHelpers'
import './Likes.css'

export default function Likes() {
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()
  const { user } = useAuth()
  // 'likes' shows one-way people who liked you; 'matches' shows mutual matches
  const [activeTab, setActiveTab] = useState('matches')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const load = async () => {
      try {
        if (activeTab === 'matches') {
          const matches = await getMutualMatches(user.id)
          setItems(matches)
        } else {
          const liked = await getUsersWhoLikedMe(user.id)
          // Show only one-way likes (not yet mutual)
          setItems(liked.filter(l => !l.matched))
        }
      } catch (error) {
        console.error('Error loading likes/matches:', error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, activeTab])

  const handleItemClick = (item) => {
    if (activeTab === 'matches' && item.conversationId) {
      navigate(`/chat/${item.conversationId}`)
    } else if (activeTab === 'matches') {
      navigate('/messages')
    }
    // One-way likes are not tappable (no conversation yet)
  }

  const emptyHeading = activeTab === 'matches' ? 'No matches yet' : 'No likes yet'
  const emptyText = activeTab === 'matches'
    ? 'When you and someone else both like or wave at each other, they\'ll show up here.'
    : 'When someone likes or waves at you, they\'ll show up here.'

  return (
    <div className="likes-container">
      <main className="likes-main">
        <header className="likes-header">
          <h1 className="likes-title">Matches</h1>
        </header>

        {/* Tabs */}
        <div className="likes-tabs">
          <button
            className={`likes-tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="tab-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Matches</span>
          </button>
          <button
            className={`likes-tab ${activeTab === 'likes' ? 'active' : ''}`}
            onClick={() => setActiveTab('likes')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>Likes</span>
          </button>
        </div>

        <section className="likes-content">
          {loading ? (
            <div className="likes-loading">Loading...</div>
          ) : items.length === 0 ? (
            <div className="likes-empty">
              <div className="likes-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <p className="likes-empty-heading">{emptyHeading}</p>
              <p className="likes-empty-text">{emptyText}</p>
            </div>
          ) : (
            <div className="likes-list">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`like-item${activeTab === 'matches' ? ' like-item-tappable' : ''}`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="like-avatar">
                    {item.photos?.find(u => u.startsWith('http')) ? (
                      <img src={item.photos.find(u => u.startsWith('http'))} alt={item.full_name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {item.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="like-info">
                    <div className="like-header">
                      <span className="like-name">{item.full_name}</span>
                      {item.likeType === 'heart' ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="like-icon heart-icon">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="like-icon friendship-icon">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      )}
                    </div>
                    {activeTab === 'matches' ? (
                      <span className="like-matched">
                        {item.likeType === 'friendship' ? "You're friends!" : "It's a match!"}
                        {item.conversationId && (
                          <span className="match-chat-hint"> · Tap to chat</span>
                        )}
                      </span>
                    ) : (
                      <span className="like-pending">Liked you</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-nav">
        <Link to="/home" className={`nav-item ${pathname === '/home' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </Link>
        <Link to="/likes" className={`nav-item ${pathname === '/likes' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </Link>
        <Link to="/messages" className={`nav-item ${pathname === '/messages' || pathname.startsWith('/chat') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </Link>
        <Link to="/profile" className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </nav>
    </div>
  )
}
