import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, query, where, getDocs, addDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Create or get a conversation between two users
 */
export async function getOrCreateConversation(userId1, userId2, likeType) {
  // Sort user IDs to ensure consistent conversation ID
  const participants = [userId1, userId2].sort()
  
  // Check if conversation already exists
  // We need to check both participants are in the array
  const conversationsRef = collection(db, 'conversations')
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', userId1),
    where('likeType', '==', likeType)
  )
  
  const snapshot = await getDocs(q)
  
  // Filter to find conversation with both participants
  const existingConv = snapshot.docs.find(doc => {
    const data = doc.data()
    return data.participants.includes(userId1) && data.participants.includes(userId2)
  })
  
  if (existingConv) {
    // Conversation exists, return it
    return existingConv.id
  }
  
  // Create new conversation
  const conversationRef = doc(conversationsRef)
  await setDoc(conversationRef, {
    participants,
    lastMessage: '',
    lastMessageTime: serverTimestamp(),
    lastMessageSenderId: null,
    likeType,
    createdAt: serverTimestamp(),
    unreadCount: {
      [userId1]: 0,
      [userId2]: 0
    }
  })
  
  return conversationRef.id
}

/**
 * Check if two users have matched (both liked each other)
 */
export async function checkMatch(userId1, userId2, likeType) {
  const likesRef = collection(db, 'likes')
  
  // Check if both users liked each other
  const q1 = query(
    likesRef,
    where('fromUserId', '==', userId1),
    where('toUserId', '==', userId2),
    where('likeType', '==', likeType)
  )
  
  const q2 = query(
    likesRef,
    where('fromUserId', '==', userId2),
    where('toUserId', '==', userId1),
    where('likeType', '==', likeType)
  )
  
  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(q1),
    getDocs(q2)
  ])
  
  return !snapshot1.empty && !snapshot2.empty
}

/**
 * Record a like from one user to another
 */
export async function recordLike(fromUserId, toUserId, likeType) {
  const likesRef = collection(db, 'likes')
  
  // Check if like already exists
  const q = query(
    likesRef,
    where('fromUserId', '==', fromUserId),
    where('toUserId', '==', toUserId),
    where('likeType', '==', likeType)
  )
  
  const snapshot = await getDocs(q)
  
  if (!snapshot.empty) {
    // Like already exists
    return snapshot.docs[0].id
  }
  
  // Create new like
  const likeRef = doc(likesRef)
  await setDoc(likeRef, {
    fromUserId,
    toUserId,
    likeType,
    createdAt: serverTimestamp(),
    matched: false
  })
  
  // Check if it's a match
  const isMatch = await checkMatch(fromUserId, toUserId, likeType)
  
  if (isMatch) {
    // Update both likes to mark as matched
    await updateDoc(likeRef, { matched: true })
    
    // Update the other like document
    const q2 = query(
      likesRef,
      where('fromUserId', '==', toUserId),
      where('toUserId', '==', fromUserId),
      where('likeType', '==', likeType)
    )
    const snapshot2 = await getDocs(q2)
    if (!snapshot2.empty) {
      await updateDoc(snapshot2.docs[0].ref, { matched: true })
    }
    
    // Create conversation if matched
    await getOrCreateConversation(fromUserId, toUserId, likeType)
    
    return { likeId: likeRef.id, isMatch: true }
  }
  
  return { likeId: likeRef.id, isMatch: false }
}

/**
 * Update user's online status
 */
export async function updatePresence(userId, isOnline) {
  const presenceRef = doc(db, 'presence', userId)
  await setDoc(presenceRef, {
    userId,
    isOnline,
    lastSeen: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true })
}

/**
 * Mark messages as read in a conversation
 */
export async function markConversationAsRead(conversationId, userId) {
  const conversationRef = doc(db, 'conversations', conversationId)
  const conversationSnap = await getDoc(conversationRef)
  
  if (conversationSnap.exists()) {
    const data = conversationSnap.data()
    await updateDoc(conversationRef, {
      unreadCount: {
        ...data.unreadCount,
        [userId]: 0
      }
    })
  }
}
