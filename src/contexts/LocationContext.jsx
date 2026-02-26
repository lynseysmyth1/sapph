import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'

const LocationContext = createContext(null)

// Normalise the permission string returned by Capacitor across iOS/Android/web
function normaliseStatus(raw) {
  if (!raw) return 'unknown'
  // iOS/Android returns 'granted' | 'denied' | 'prompt'
  // Web returns 'granted' | 'denied' | 'prompt'
  if (raw === 'granted') return 'granted'
  if (raw === 'denied') return 'denied'
  if (raw === 'prompt' || raw === 'prompt-with-rationale') return 'prompt'
  return 'unknown'
}

export function LocationProvider({ children }) {
  const { user } = useAuth()
  const [permissionStatus, setPermissionStatus] = useState('unknown')

  // Check current permission status without prompting
  const checkPermission = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        // On web use the Permissions API if available
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: 'geolocation' })
          const status = normaliseStatus(result.state)
          setPermissionStatus(status)
          return status
        }
        setPermissionStatus('prompt')
        return 'prompt'
      }
      const result = await Geolocation.checkPermissions()
      const status = normaliseStatus(result.location || result.coarseLocation)
      setPermissionStatus(status)
      return status
    } catch {
      setPermissionStatus('unknown')
      return 'unknown'
    }
  }, [])

  // Request the system permission prompt, return the resulting status
  const requestPermission = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        // On web, requesting permission is done by calling getCurrentPosition
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => { setPermissionStatus('granted'); resolve('granted') },
            () => { setPermissionStatus('denied');  resolve('denied')  }
          )
        })
      }
      const result = await Geolocation.requestPermissions({ permissions: ['location'] })
      const status = normaliseStatus(result.location || result.coarseLocation)
      setPermissionStatus(status)
      return status
    } catch {
      setPermissionStatus('denied')
      return 'denied'
    }
  }, [])

  // Capture current position and write it to the user's Firestore profile
  const captureAndSaveCoords = useCallback(async (userId) => {
    const uid = userId || user?.id
    if (!uid) return
    try {
      let coords
      if (!Capacitor.isNativePlatform()) {
        coords = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            reject,
            { timeout: 10000 }
          )
        )
      } else {
        const pos = await Geolocation.getCurrentPosition({ timeout: 10000 })
        coords = pos.coords
      }
      const profileRef = doc(db, 'profiles', uid)
      await updateDoc(profileRef, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        location_updated_at: new Date().toISOString(),
      })
    } catch (err) {
      // Non-fatal — silently log; distance filter will simply be skipped
      console.warn('[LocationContext] Failed to capture/save coords:', err?.message || err)
    }
  }, [user?.id])

  // On mount (and when user changes): check permission and, if already granted, silently refresh coords
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const init = async () => {
      const status = await checkPermission()
      if (cancelled) return
      if (status === 'granted') {
        captureAndSaveCoords(user.id)
      }
    }

    init()
    return () => { cancelled = true }
  }, [user?.id, checkPermission, captureAndSaveCoords])

  return (
    <LocationContext.Provider value={{ permissionStatus, checkPermission, requestPermission, captureAndSaveCoords }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}
