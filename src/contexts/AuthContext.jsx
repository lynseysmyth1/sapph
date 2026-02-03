import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { updatePresence } from '../lib/chatHelpers'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const mountedRef = useRef(true)

  const fetchProfile = async (userId) => {
    if (!userId) return null
    try {
      const profileRef = doc(db, 'profiles', userId)
      const profileSnap = await getDoc(profileRef)
      
      if (profileSnap.exists()) {
        const data = { id: profileSnap.id, ...profileSnap.data() }
        if (mountedRef.current) setProfile(data)
        return data
      } else {
        // Profile doesn't exist yet - create empty one
        const emptyProfile = {
          id: userId,
          onboarding_completed: false,
          updated_at: new Date().toISOString()
        }
        await setDoc(profileRef, emptyProfile)
        if (mountedRef.current) setProfile(emptyProfile)
        return emptyProfile
      }
    } catch (err) {
      console.error('fetchProfile error:', err)
      if (mountedRef.current) setProfile(null)
      return null
    }
  }

  useEffect(() => {
    mountedRef.current = true

    // Timeout: if auth doesn't resolve within 10s (e.g. no network on device), show app anyway
    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false)
      }
    }, 10000)

    // Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mountedRef.current) return

      clearTimeout(loadingTimeout)

      if (firebaseUser) {
        // User is signed in
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified
        })
        
        // Update online status
        updatePresence(firebaseUser.uid, true).catch(err => {
          console.error('Error updating presence:', err)
        })
        
        setLoading(true)
        try {
          await fetchProfile(firebaseUser.uid)
          if (mountedRef.current) {
            const path = window.location.pathname
            if (path === '/signin' || path === '/enter' || path === '/') {
              navigate('/home', { replace: true })
            }
          }
        } finally {
          if (mountedRef.current) setLoading(false)
        }
      } else {
        // User is signed out
        // Update offline status before clearing user
        if (user?.id) {
          updatePresence(user.id, false).catch(err => {
            console.error('Error updating presence:', err)
          })
        }
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      clearTimeout(loadingTimeout)
      unsubscribe()
    }
  }, [navigate])

  const value = {
    user,
    profile,
    loading,
    refreshProfile: async () => {
      if (user) {
        await fetchProfile(user.id)
      }
    },
    signOut: async () => {
      setLoading(true)
      try {
        // Update offline status before signing out
        if (user?.id) {
          await updatePresence(user.id, false)
        }
        await firebaseSignOut(auth)
        if (mountedRef.current) {
          setProfile(null)
          setUser(null)
          setLoading(false)
        }
      } catch (err) {
        console.error('Sign out error:', err)
        if (mountedRef.current) setLoading(false)
      }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
