import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'
import { auth, db } from '../lib/firebase'
import { updatePresence } from '../lib/chatHelpers'

// Shorter timeout on native — CapacitorHttp is disabled so Firebase uses WebKit fetch,
// but WKWebView network is still slower than a desktop browser.
const PROFILE_FETCH_TIMEOUT_MS = Capacitor.isNativePlatform() ? 5000 : 10000

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true) // Initial auth check (max 2s)
  const [profileLoading, setProfileLoading] = useState(false) // Profile fetch in progress
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
    let timeoutCleared = false

    console.log('[AuthContext] Initializing auth state listener')

    // Timeout: if auth doesn't resolve within 2s (e.g. slow network on TestFlight), show splash anyway
    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current && !timeoutCleared) {
        console.warn('[AuthContext] Auth check timeout (2s) - proceeding without auth state')
        setAuthLoading(false)
        // If we timeout and have no user, ensure we show splash (user will be null)
        // Don't set profileLoading here - let it happen naturally if user exists later
      }
    }, 2000)

    // Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!mountedRef.current) return

        clearTimeout(loadingTimeout)
        timeoutCleared = true
        console.log('[AuthContext] Auth state changed:', firebaseUser ? `User ${firebaseUser.uid}` : 'No user')

        if (firebaseUser) {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified
          })
          setAuthLoading(false)
          
          // Update presence in background (don't await)
          updatePresence(firebaseUser.uid, true).catch(err => {
            console.error('[AuthContext] Error updating presence:', err)
          })
          
          // Start profile fetch (non-blocking)
          setProfileLoading(true)
          
          // Fetch full profile with retry logic (non-blocking)
          const fetchWithRetry = async (retries = 2) => {
            for (let i = 0; i <= retries; i++) {
              try {
                const profileData = await Promise.race([
                  fetchProfile(firebaseUser.uid),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PROFILE_FETCH_TIMEOUT_MS))
                ])
                
                if (mountedRef.current && profileData) {
                  setProfile(profileData)
                  setProfileLoading(false)
                  return // Success - exit retry loop
                }
              } catch (err) {
                if (i === retries) {
                  // Final retry failed - set safe default
                  console.warn('[AuthContext] Profile fetch failed after retries:', err.message)
                  // Try one more direct check
                  try {
                    const profileRef = doc(db, 'profiles', firebaseUser.uid)
                    const profileSnap = await getDoc(profileRef)
                    if (profileSnap.exists() && mountedRef.current) {
                      const data = profileSnap.data()
                      setProfile({
                        id: firebaseUser.uid,
                        ...data,
                        onboarding_completed: data.onboarding_completed || false
                      })
                    } else {
                      // Profile doesn't exist - create empty one with safe default
                      const emptyProfile = {
                        id: firebaseUser.uid,
                        onboarding_completed: false,
                        updated_at: new Date().toISOString()
                      }
                      await setDoc(profileRef, emptyProfile)
                      if (mountedRef.current) {
                        setProfile(emptyProfile)
                      }
                    }
                  } catch (directErr) {
                    console.error('[AuthContext] Direct profile check failed:', directErr)
                    // Set safe default profile
                    if (mountedRef.current) {
                      setProfile({
                        id: firebaseUser.uid,
                        onboarding_completed: false
                      })
                    }
                  }
                  setProfileLoading(false)
                } else {
                  // Wait before retry (exponential backoff)
                  await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
                }
              }
            }
          }
          
          fetchWithRetry().catch(() => {
            // All retries failed - set safe default
            console.warn('[AuthContext] Profile fetch failed completely')
            if (mountedRef.current) {
              setProfile({
                id: firebaseUser.uid,
                onboarding_completed: false
              })
              setProfileLoading(false)
            }
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
          setAuthLoading(false)
          setProfileLoading(false)
        }
      } catch (err) {
        // Catch any errors to prevent white screen
        console.error('[AuthContext] Error in auth state listener:', err)
        if (mountedRef.current) {
          setAuthLoading(false)
          setProfileLoading(false)
          // On error, if we don't have a user yet, ensure we're in a clean state
          // This prevents getting stuck on loading screen
        }
      }
    })

    // Ensure timeout always clears loading state if listener never fires
    // This handles cases where Firebase Auth fails to initialize
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && !timeoutCleared) {
        console.warn('[AuthContext] Safety timeout - auth listener may not have fired')
        setAuthLoading(false)
      }
    }, 3000) // 3s safety net

    return () => {
      mountedRef.current = false
      clearTimeout(loadingTimeout)
      clearTimeout(safetyTimeout)
      unsubscribe()
    }
  }, [navigate])

  // Profile state helpers
  const isProfileReady = profile !== null && profile.id === user?.id
  const needsOnboarding = isProfileReady && profile.onboarding_completed === false
  const isOnboardingComplete = isProfileReady && profile.onboarding_completed === true

  const value = {
    user,
    profile,
    authLoading,      // Initial auth check
    profileLoading,   // Profile fetch in progress
    loading: authLoading || profileLoading, // Combined for backwards compatibility
    isProfileReady,
    needsOnboarding,
    isOnboardingComplete,
    refreshProfile: async () => {
      if (user) {
        setProfileLoading(true)
        try {
          await fetchProfile(user.id)
        } finally {
          setProfileLoading(false)
        }
      }
    },
    /** Update profile in memory (e.g. after onboarding save so Home doesn't redirect back) */
    updateProfile: (updates) => {
      if (mountedRef.current && profile) {
        setProfile((prev) => (prev ? { ...prev, ...updates } : prev))
      }
    },
    signOut: async () => {
      try {
        if (user?.id) {
          updatePresence(user.id, false).catch(() => {})
        }
        await firebaseSignOut(auth)
        // onAuthStateChanged will fire and clear user/profile state
      } catch (err) {
        console.error('Sign out error:', err)
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
