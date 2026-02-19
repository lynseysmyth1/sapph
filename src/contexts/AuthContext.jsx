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

    // Timeout: if auth doesn't resolve within 2s (e.g. slow network on TestFlight), show splash anyway
    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false)
      }
    }, 2000)

    // Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!mountedRef.current) return

        clearTimeout(loadingTimeout)

        if (firebaseUser) {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified
          })
          setLoading(false)
          
          // Update presence in background (don't await)
          updatePresence(firebaseUser.uid, true).catch(err => {
            console.error('[AuthContext] Error updating presence:', err)
          })
          
          // Fetch profile in background - don't block UI
          // Set a minimal profile immediately; use sessionStorage if user just completed onboarding (survives reload)
          if (mountedRef.current) {
            const justCompleted = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('onboardingComplete') === firebaseUser.uid
            setProfile({
              id: firebaseUser.uid,
              onboarding_completed: justCompleted || undefined // Don't set false - leave undefined until we know
            })
          }
          
          // Fetch full profile with retry logic (non-blocking)
          const fetchWithRetry = async (retries = 2) => {
            for (let i = 0; i <= retries; i++) {
              try {
                const profileData = await Promise.race([
                  fetchProfile(firebaseUser.uid),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)) // Increased to 10s
                ])
                
                if (mountedRef.current && profileData) {
                  setProfile(profileData)
                  // Clear sessionStorage flag once we have the real profile
                  if (profileData.onboarding_completed) {
                    sessionStorage.removeItem('onboardingComplete')
                  }
                  return // Success - exit retry loop
                }
              } catch (err) {
                if (i === retries) {
                  // Final retry failed - log error but don't block UI
                  console.warn('[AuthContext] Profile fetch failed after retries:', err.message)
                  // Try to check Firestore directly for onboarding_completed status
                  try {
                    const profileRef = doc(db, 'profiles', firebaseUser.uid)
                    const profileSnap = await getDoc(profileRef)
                    if (profileSnap.exists() && mountedRef.current) {
                      const data = profileSnap.data()
                      // Update profile with at least the onboarding_completed status
                      setProfile(prev => ({
                        ...prev,
                        onboarding_completed: data.onboarding_completed || false
                      }))
                    }
                  } catch (directErr) {
                    console.error('[AuthContext] Direct profile check failed:', directErr)
                  }
                } else {
                  // Wait before retry (exponential backoff)
                  await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
                }
              }
            }
          }
          
          fetchWithRetry().catch(() => {
            // All retries failed - keep minimal profile
            console.warn('[AuthContext] Profile fetch failed completely')
          })
        } else {
          // User is signed out
          if (user?.id) {
            updatePresence(user.id, false).catch(err => {
              console.error('[AuthContext] Error updating presence:', err)
            })
          }
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } catch (err) {
        // Catch any errors to prevent white screen
        console.error('[AuthContext] Error in auth state listener:', err)
        if (mountedRef.current) {
          setLoading(false)
        }
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
    /** Update profile in memory (e.g. after onboarding save so Home doesn't redirect back) */
    updateProfile: (updates) => {
      if (mountedRef.current && profile) {
        setProfile((prev) => (prev ? { ...prev, ...updates } : prev))
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
