import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { markConversationAsRead } from '../lib/chatHelpers'
import './Chat.css'

export default function Chat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [isOnline, setIsOnline] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const pathname = location.pathname

  useEffect(() => {
    if (!chatId || !user?.id) return

    let unsubscribePresence = null
    let unsubscribeMessages = null

    // Get conversation data and other user info
    const conversationRef = doc(db, 'conversations', chatId)
    
    getDoc(conversationRef).then(async (docSnap) => {
      if (!docSnap.exists()) {
        console.error('Conversation not found')
        navigate('/messages')
        return
      }

      const data = docSnap.data()
      
      // Verify user is a participant
      if (!data.participants?.includes(user.id)) {
        console.error('User not a participant in this conversation')
        navigate('/messages')
        return
      }

      // Get the other user's ID
      const otherUserId = data.participants.find(id => id !== user.id)
      if (!otherUserId) return

      // Fetch other user's profile
      try {
        const profileRef = doc(db, 'profiles', otherUserId)
        const profileSnap = await getDoc(profileRef)
        if (profileSnap.exists()) {
          const profileData = profileSnap.data()
          setOtherUser({
            id: otherUserId,
            name: profileData.full_name || 'Unknown',
            photo: profileData.photos?.[0] || null
          })
        } else {
          setOtherUser({
            id: otherUserId,
            name: 'Unknown',
            photo: null
          })
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setOtherUser({
          id: otherUserId,
          name: 'Unknown',
          photo: null
        })
      }

      // Check online status and listen for changes
      try {
        const presenceRef = doc(db, 'presence', otherUserId)
        const presenceSnap = await getDoc(presenceRef)
        if (presenceSnap.exists()) {
          setIsOnline(presenceSnap.data().isOnline || false)
        }
        
        // Listen for online status changes
        unsubscribePresence = onSnapshot(presenceRef, (snap) => {
          if (snap.exists()) {
            setIsOnline(snap.data().isOnline || false)
          } else {
            setIsOnline(false)
          }
        }, (err) => {
          console.error('Error listening to presence:', err)
        })
      } catch (err) {
        console.error('Error checking online status:', err)
      }

      // Listen to messages
      const messagesRef = collection(db, 'conversations', chatId, 'messages')
      const q = query(messagesRef, orderBy('timestamp', 'asc'))
      
      unsubscribeMessages = onSnapshot(
        q,
        (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isSent: doc.data().senderId === user.id
          }))
          setMessages(msgs)
          
          // Mark conversation as read when messages are loaded
          if (msgs.length > 0) {
            markConversationAsRead(chatId, user.id).catch(err => {
              console.error('Error marking conversation as read:', err)
            })
          }
        },
        (error) => {
          console.error('Error fetching messages:', error)
          if (error.code === 'failed-precondition') {
            console.warn('Firestore index needed for messages. See docs/FIRESTORE_CHAT_SCHEMA.md')
          }
        }
      )
    }).catch((err) => {
      console.error('Error fetching conversation:', err)
      navigate('/messages')
    })

    return () => {
      if (unsubscribeMessages) unsubscribeMessages()
      if (unsubscribePresence) unsubscribePresence()
    }
  }, [chatId, user, navigate])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return ''
    const time = timestamp?.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp))
    const now = new Date()
    const diffMs = now - time
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (diffDays < 1) {
      return time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays < 7) {
      return time.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    } else {
      return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || !chatId || !user?.id) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    try {
      // Add message to Firestore
      const messagesRef = collection(db, 'conversations', chatId, 'messages')
      await addDoc(messagesRef, {
        text: messageText,
        senderId: user.id,
        timestamp: serverTimestamp(),
        read: false
      })

      // Update conversation metadata
      const conversationRef = doc(db, 'conversations', chatId)
      const conversationSnap = await getDoc(conversationRef)
      if (conversationSnap.exists()) {
        const conversationData = conversationSnap.data()
        const otherUserId = conversationData.participants.find(id => id !== user.id)
        
        // Update last message and increment unread count for recipient
        const currentUnreadCount = conversationData.unreadCount || {}
        await updateDoc(conversationRef, {
          lastMessage: messageText,
          lastMessageTime: serverTimestamp(),
          lastMessageSenderId: user.id,
          unreadCount: {
            ...currentUnreadCount,
            [otherUserId]: (currentUnreadCount[otherUserId] || 0) + 1,
            [user.id]: 0 // Reset sender's unread count
          }
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageText) // Restore message on error
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate('/messages')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {otherUser?.photo ? (
              <img src={otherUser.photo} alt={otherUser.name} />
            ) : (
              <div className="avatar-placeholder">
                {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="chat-header-text">
            <h2 className="chat-header-name">{otherUser?.name || 'Loading...'}</h2>
            <div className="chat-status">
              {isOnline && (
                <>
                  <span className="status-dot"></span>
                  <span className="status-text">Online</span>
                </>
              )}
              {!isOnline && (
                <span className="status-text offline">Offline</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-bubble ${message.isSent ? 'sent' : 'received'}`}
              >
                <p className="message-text">{message.text}</p>
                <span className="message-time">{formatMessageTime(message.timestamp)}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </main>

      {/* Input */}
      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!newMessage.trim() || sending}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>

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
