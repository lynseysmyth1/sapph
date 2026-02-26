import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getDiscoveryProfiles } from '../lib/discoveryHelpers'
import { clearPasses } from '../lib/chatHelpers'

const DiscoveryContext = createContext(null)

export function DiscoveryProvider({ children }) {
  const { user, profile, profileLoading } = useAuth()

  const [profiles, setProfiles] = useState([])
  const [currentProfile, setCurrentProfile] = useState(null)
  const [passedUserIds, setPassedUserIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [reloadIncludingPassed, setReloadIncludingPassed] = useState(false)

  const loadingStartRef = useRef(null)

  // Refs that track what actually triggered the last load.
  // The effect only calls loadProfiles() when one of these changes — not on
  // profileLoading toggles caused by Firebase token refreshes.
  const loadedForUserRef = useRef(null)    // userId of last successful load trigger
  const lastReloadKeyRef = useRef(null)    // reloadKey of last load trigger
  const lastPassedIdsRef = useRef(null)    // passedUserIds reference of last load trigger

  // Clear state on sign-out
  useEffect(() => {
    if (!user?.id) {
      setProfiles([])
      setCurrentProfile(null)
      setPassedUserIds([])
      setLoading(false)
      setHasLoaded(false)
      // Reset load guards so next sign-in triggers a fresh load
      loadedForUserRef.current = null
      lastReloadKeyRef.current = null
      lastPassedIdsRef.current = null
    }
  }, [user?.id])

  // Load discovery profiles
  useEffect(() => {
    if (profileLoading) {
      setLoading(false)
      return
    }

    if (!user?.id || !profile?.id) {
      setLoading(false)
      return
    }

    if (profile.onboarding_completed !== true) {
      setLoading(false)
      return
    }

    // Guard: only load when something meaningful changed.
    // Prevents Firebase token-refresh profileLoading toggles from wiping loaded profiles.
    const userChanged   = loadedForUserRef.current !== user.id
    const reloadChanged = lastReloadKeyRef.current !== reloadKey
    const passedChanged = lastPassedIdsRef.current !== passedUserIds // reference equality

    if (!userChanged && !reloadChanged && !passedChanged) return

    // Stamp the refs before the async call so concurrent re-runs are also skipped
    loadedForUserRef.current = user.id
    lastReloadKeyRef.current = reloadKey
    lastPassedIdsRef.current = passedUserIds

    const loadProfiles = async () => {
      setLoading(true)
      loadingStartRef.current = Date.now()
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile load timeout')), 15000)
        )

        const currentUserCoords = (profile.latitude != null && profile.longitude != null)
          ? { latitude: profile.latitude, longitude: profile.longitude }
          : null

        const discoveryProfiles = await Promise.race([
          getDiscoveryProfiles(user.id, passedUserIds, 50, {
            includePassed: reloadIncludingPassed,
            matchingPreferences: profile.matching_preferences || null,
            currentUserCoords
          }),
          timeoutPromise
        ])

        setProfiles(discoveryProfiles)
        if (discoveryProfiles.length > 0) {
          setCurrentProfile(discoveryProfiles[0])
        } else {
          setCurrentProfile(null)
        }
      } catch (error) {
        console.error('[Discovery] Error loading profiles:', error.message || error)
        setProfiles([])
        setCurrentProfile(null)
      } finally {
        setReloadIncludingPassed(false)
        const elapsed = Date.now() - (loadingStartRef.current || Date.now())
        const remaining = Math.max(0, 200 - elapsed)
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining))
        }
        setLoading(false)
        setHasLoaded(true)
      }
    }

    loadProfiles()
    // reloadIncludingPassed intentionally omitted — reset in finally must not trigger another load
  }, [user?.id, profile?.id, profile?.onboarding_completed, profileLoading, passedUserIds, reloadKey])

  const loadNextProfile = () => {
    if (profiles.length <= 1) {
      setCurrentProfile(null)
      setProfiles([])
      // Trigger a fresh reload via reloadKey (not passedUserIds — that reference-equality
      // trick was unreliable and could cause false positives in the guard above)
      setReloadKey(k => k + 1)
      return
    }
    const remaining = profiles.slice(1)
    setProfiles(remaining)
    setCurrentProfile(remaining[0])
  }

  const handleReloadAllProfiles = async () => {
    if (user?.id) {
      await clearPasses(user.id)
    }
    setReloadKey(k => k + 1)
    setPassedUserIds([])
    setReloadIncludingPassed(true)
    setLoading(true)
  }

  const addPassedUserId = (id) => setPassedUserIds(prev => [...prev, id])

  const removeLastPassedUserId = () => setPassedUserIds(prev => prev.slice(0, -1))

  return (
    <DiscoveryContext.Provider value={{
      profiles,
      currentProfile,
      loading,
      hasLoaded,
      passedUserIds,
      loadNextProfile,
      handleReloadAllProfiles,
      addPassedUserId,
      removeLastPassedUserId,
    }}>
      {children}
    </DiscoveryContext.Provider>
  )
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext)
  if (!ctx) throw new Error('useDiscovery must be used within DiscoveryProvider')
  return ctx
}
