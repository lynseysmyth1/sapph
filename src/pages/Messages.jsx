import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import './Messages.css'

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const [activeTab, setActiveTab] = useState('heart') // 'heart' or 'friendship'
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Query Firestore for conversations
    const conversationsRef = collection(db, 'conversations')
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.id),
      where('likeType', '==', activeTab),
      orderBy('lastMessageTime', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const conversationsData = []
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          
          // Get the other user's ID (not the current user)
          const otherUserId = data.participants.find(id => id !== user.id)
          if (!otherUserId) continue

          // Fetch the other user's profile
          let otherUserProfile = null
          try {
            const profileRef = doc(db, 'profiles', otherUserId)
            const profileSnap = await getDoc(profileRef)
            if (profileSnap.exists()) {
              otherUserProfile = profileSnap.data()
            }
          } catch (err) {
            console.error('Error fetching profile:', err)
          }

          // Check online status
          let isOnline = false
          try {
            const presenceRef = doc(db, 'presence', otherUserId)
            const presenceSnap = await getDoc(presenceRef)
            if (presenceSnap.exists()) {
              isOnline = presenceSnap.data().isOnline || false
            }
          } catch (err) {
            // Presence might not exist, that's okay
          }

          conversationsData.push({
            id: docSnap.id,
            conversationId: docSnap.id,
            userId: otherUserId,
            userName: otherUserProfile?.full_name || 'Unknown',
            userPhoto: otherUserProfile?.photos?.[0] || null,
            lastMessage: data.lastMessage || '',
            timestamp: data.lastMessageTime,
            unreadCount: data.unreadCount?.[user.id] || 0,
            likeType: data.likeType,
            isOnline
          })
        }

        setConversations(conversationsData)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching conversations:', error)
        setLoading(false)
        // If index doesn't exist, show helpful message
        if (error.code === 'failed-precondition') {
          console.warn('Firestore index needed. See docs/FIRESTORE_CHAT_SCHEMA.md')
        }
      }
    )

    return () => unsubscribe()
  }, [user, activeTab])

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const now = new Date()
    const time = timestamp?.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : timestamp.toDate())
    const diffMs = now - time
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`
    return time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="messages-container">
      <main className="messages-main">
        <header className="messages-header">
          <h1 className="messages-title">Messages</h1>
        </header>

        {/* Tabs */}
        <div className="messages-tabs">
          <button
            className={`messages-tab ${activeTab === 'heart' ? 'active' : ''}`}
            onClick={() => setActiveTab('heart')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="tab-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Heart</span>
          </button>
          <button
            className={`messages-tab ${activeTab === 'friendship' ? 'active' : ''}`}
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

        {/* Conversation List */}
        <section className="messages-content">
          {loading ? (
            <div className="messages-loading">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="messages-empty">
              <p>No {activeTab === 'heart' ? 'heart' : 'friendship'} conversations yet</p>
            </div>
          ) : (
            <div className="conversations-list">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="conversation-item"
                  onClick={() => navigate(`/chat/${conversation.conversationId}`)}
                >
                  <div className="conversation-avatar">
                    {conversation.userPhoto ? (
                      <img src={conversation.userPhoto} alt={conversation.userName} />
                    ) : (
                      <div className="avatar-placeholder">
                        {conversation.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="conversation-name">{conversation.userName}</span>
                      {conversation.likeType === 'heart' ? (
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
                    <p className="conversation-preview">{conversation.lastMessage}</p>
                  </div>
                  <div className="conversation-meta">
                    <span className="conversation-time">{formatTimestamp(conversation.timestamp)}</span>
                    {conversation.unreadCount > 0 && (
                      <span className="unread-badge">{conversation.unreadCount}</span>
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
