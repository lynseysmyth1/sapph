import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Returns the total number of unread messages across all conversations
 * for the currently signed-in user. Updates in real time via onSnapshot.
 */
export function useUnreadCount() {
  const { user } = useAuth()
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setTotal(0)
      return
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.id)
    )

    const unsub = onSnapshot(q, snap => {
      const count = snap.docs.reduce(
        (sum, d) => sum + (d.data().unreadCount?.[user.id] || 0),
        0
      )
      setTotal(count)
    }, err => {
      console.error('[useUnreadCount] Error:', err)
    })

    return () => unsub()
  }, [user?.id])

  return total
}
