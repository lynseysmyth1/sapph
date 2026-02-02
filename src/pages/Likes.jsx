import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUsersWhoLikedMe } from '../lib/discoveryHelpers'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import './Likes.css'

export default function Likes() {
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('heart') // 'heart' or 'friendship'
  const [likes, setLikes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const loadLikes = async () => {
      try {
        const usersWhoLiked = await getUsersWhoLikedMe(user.id, activeTab)
        setLikes(usersWhoLiked)
      } catch (error) {
        console.error('Error loading likes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLikes()
  }, [user, activeTab])

  const handleLikeClick = async (likedUserId, likeType) => {
    // Check if there's a conversation already
    try {
      // Try to find conversation
      const conversationsRef = collection(db, 'conversations')
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', user.id),
        where('likeType', '==', likeType)
      )
      const snapshot = await getDocs(q)
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        if (data.participants.includes(likedUserId)) {
          // Conversation exists, navigate to it
          navigate(`/chat/${docSnap.id}`)
          return
        }
      }
      
      // No conversation yet, navigate to messages
      navigate('/messages')
    } catch (error) {
      console.error('Error checking conversation:', error)
      navigate('/messages')
    }
  }

  return (
    <div className="likes-container">
      <main className="likes-main">
        <header className="likes-header">
          <h1 className="likes-title">Likes</h1>
        </header>

        {/* Tabs */}
        <div className="likes-tabs">
          <button
            className={`likes-tab ${activeTab === 'heart' ? 'active' : ''}`}
            onClick={() => setActiveTab('heart')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="tab-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Heart</span>
          </button>
          <button
            className={`likes-tab ${activeTab === 'friendship' ? 'active' : ''}`}
            onClick={() => setActiveTab('friendship')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Friendship</span>
          </button>
        </div>

        <section className="likes-content">
          {loading ? (
            <div className="likes-loading">Loading likes...</div>
          ) : likes.length === 0 ? (
            <div className="likes-empty">
              <div className="likes-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <p className="likes-empty-heading">No {activeTab === 'heart' ? 'heart' : 'friendship'} likes yet</p>
              <p className="likes-empty-text">When someone likes you, they'll show up here. Like people on Home to see mutual likes.</p>
            </div>
          ) : (
            <div className="likes-list">
              {likes.map((like) => (
                <div
                  key={like.id}
                  className="like-item"
                  onClick={() => handleLikeClick(like.id, like.likeType)}
                >
                  <div className="like-avatar">
                    {like.photos?.[0] ? (
                      <img src={like.photos[0]} alt={like.full_name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {like.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="like-info">
                    <div className="like-header">
                      <span className="like-name">{like.full_name}</span>
                      {like.likeType === 'heart' ? (
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
                    {like.matched && (
                      <span className="like-matched">It's a match! 💚</span>
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
          <span>Home</span>
        </Link>
        <Link to="/likes" className={`nav-item ${pathname === '/likes' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>Likes</span>
        </Link>
        <Link to="/messages" className={`nav-item ${pathname === '/messages' || pathname.startsWith('/chat') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat</span>
        </Link>
        <Link to="/profile" className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  )
}
