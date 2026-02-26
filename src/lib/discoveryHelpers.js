import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Haversine formula — returns distance in miles between two lat/lng coordinates.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 3958.8 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calculate age in years from a dob string (ISO or YYYY-MM-DD).
 * Returns null if unparseable.
 */
function calcAge(dob) {
  if (!dob) return null
  try {
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age > 0 ? age : null
  } catch (_) {
    return null
  }
}

/**
 * Returns true if the candidate profile passes all active matching preference filters.
 * A filter is only applied if the current user has set a non-empty value for it.
 * If a candidate is missing the relevant field, they are included (benefit of the doubt).
 * @param {Object} candidate - candidate profile data
 * @param {Object|null} prefs - current user's matching_preferences
 * @param {Object|null} currentUserCoords - { latitude, longitude } of the current user
 */
function passesFilters(candidate, prefs, currentUserCoords) {
  if (!prefs) return true

  // Age range — only filter if user narrowed from the defaults (18–99)
  const ageRange = prefs.age_range
  if (ageRange && (ageRange.min > 18 || ageRange.max < 99)) {
    const age = calcAge(candidate.dob)
    if (age !== null) {
      if (ageRange.min != null && age < ageRange.min) return false
      if (ageRange.max != null && age > ageRange.max) return false
    }
  }

  // Strip "Prefer not to say/share" from arrays before overlap checks.
  // Applied to both candidate values and saved preferences — old saved prefs may contain these values.
  const strip = (arr) => (arr || []).filter(v => v !== 'Prefer not to say' && v !== 'Prefer not to share')

  // Gender identity — single string field; skip filter if candidate said "Prefer not to say"
  if (prefs.gender?.length > 0 && candidate.gender_identity) {
    if (candidate.gender_identity !== 'Prefer not to say') {
      if (!prefs.gender.includes(candidate.gender_identity)) return false
    }
  }

  // Relationship goals — match against candidate's connection_goals array
  const activeRelGoals = strip(prefs.relationship_goals)
  if (activeRelGoals.length > 0) {
    const candidateGoals = strip(candidate.connection_goals)
    if (candidateGoals.length > 0) {
      if (!candidateGoals.some(g => activeRelGoals.includes(g))) return false
    }
  }

  // Relationship style
  const activeRelStyles = strip(prefs.relationship_style)
  if (activeRelStyles.length > 0) {
    const candidateStyles = strip(candidate.relationship_style)
    if (candidateStyles.length > 0) {
      if (!candidateStyles.some(s => activeRelStyles.includes(s))) return false
    }
  }

  // Sex preferences
  const activeSexPrefs = strip(prefs.sex_preferences)
  if (activeSexPrefs.length > 0) {
    const candidateSexPrefs = strip(candidate.sex_preferences)
    if (candidateSexPrefs.length > 0) {
      if (!candidateSexPrefs.some(s => activeSexPrefs.includes(s))) return false
    }
  }

  // Family plans — match against candidate's children (string) field
  const activeFamilyPlans = strip(prefs.family_plans)
  if (activeFamilyPlans.length > 0 && candidate.children) {
    if (candidate.children !== 'Prefer not to say') {
      if (!activeFamilyPlans.includes(candidate.children)) return false
    }
  }

  // Distance — only applies when current user AND candidate both have stored coordinates
  if (
    prefs.distance != null &&
    currentUserCoords?.latitude != null &&
    currentUserCoords?.longitude != null &&
    candidate.latitude != null &&
    candidate.longitude != null
  ) {
    const miles = haversineDistance(
      currentUserCoords.latitude,
      currentUserCoords.longitude,
      candidate.latitude,
      candidate.longitude
    )
    if (miles > prefs.distance) return false
  }

  return true
}

/**
 * Get profiles of other users for discovery
 * Excludes current user, already-liked, already-passed, and session-passed users
 * @param {Object} options - { includePassed: boolean, matchingPreferences: object }
 *   includePassed: When true, don't exclude Firestore passes (for "See All Profiles Again")
 *   matchingPreferences: The current user's matching_preferences object for filtering
 */
export async function getDiscoveryProfiles(currentUserId, excludeUserIds = [], maxResults = 20, options = {}) {
  const { includePassed = false, matchingPreferences = null, currentUserCoords = null } = options

  try {
    // Fetch already-liked user IDs from Firestore (always exclude)
    const likedSnap = await getDocs(query(
      collection(db, 'likes'),
      where('fromUserId', '==', currentUserId)
    ))
    const likedIds = likedSnap.docs.map(d => d.data().toUserId)

    // Fetch already-passed user IDs from Firestore (skip when includePassed for "See All Profiles Again")
    let passedIds = []
    if (!includePassed) {
      const passedSnap = await getDocs(query(
        collection(db, 'passes'),
        where('fromUserId', '==', currentUserId)
      ))
      passedIds = passedSnap.docs.map(d => d.data().toUserId)
    }

    const allExcluded = new Set([...excludeUserIds, ...likedIds, ...passedIds, currentUserId])

    // DEBUG: log exclusion breakdown
    console.log('[getDiscoveryProfiles] currentUserId:', currentUserId, '| includePassed:', includePassed)
    console.log('[getDiscoveryProfiles] likedIds (excluded):', likedIds.length, likedIds)
    console.log('[getDiscoveryProfiles] passedIds (excluded):', passedIds.length, passedIds)
    console.log('[getDiscoveryProfiles] excludeUserIds (session):', excludeUserIds.length, excludeUserIds)
    console.log('[getDiscoveryProfiles] allExcluded total:', allExcluded.size)

    const profilesRef = collection(db, 'profiles')
    const q = query(
      profilesRef,
      where('onboarding_completed', '==', true),
      limit(maxResults)
    )

    const snapshot = await getDocs(q)
    const profiles = []
    let excludedCount = 0
    let noNameCount = 0

    for (const docSnap of snapshot.docs) {
      const profileData = docSnap.data()
      const profileId = docSnap.id

      if (allExcluded.has(profileId)) {
        excludedCount++
        continue
      }

      if (!profileData.full_name) {
        noNameCount++
        continue
      }

      if (!passesFilters(profileData, matchingPreferences, currentUserCoords)) {
        excludedCount++
        continue
      }

      profiles.push({
        id: profileId,
        ...profileData
      })
    }

    // DEBUG: log result
    console.log('[getDiscoveryProfiles] profiles in DB (onboarding_completed):', snapshot.docs.length)
    console.log('[getDiscoveryProfiles] excluded by likes/passes/session:', excludedCount)
    console.log('[getDiscoveryProfiles] skipped (no full_name):', noNameCount)
    console.log('[getDiscoveryProfiles] RETURNING:', profiles.length, 'profiles')

    // Shuffle for variety
    return profiles.sort(() => Math.random() - 0.5)
  } catch (error) {
    console.error('[getDiscoveryProfiles] Error:', error.code || error.message)

    if (error.code === 'permission-denied') {
      console.error('[getDiscoveryProfiles] Permission denied! Check Firestore security rules.')
    } else if (error.code === 'failed-precondition') {
      console.error('[getDiscoveryProfiles] Missing Firestore index!')
    } else if (error.code === 'unavailable') {
      console.error('[getDiscoveryProfiles] Firestore temporarily unavailable.')
    }

    return []
  }
}

/**
 * Get users who have liked the current user (one-way, not necessarily mutual)
 */
export async function getUsersWhoLikedMe(currentUserId, likeType = null) {
  try {
    const likesRef = collection(db, 'likes')
    let q

    if (likeType) {
      q = query(likesRef, where('toUserId', '==', currentUserId), where('likeType', '==', likeType))
    } else {
      q = query(likesRef, where('toUserId', '==', currentUserId))
    }

    const snapshot = await getDocs(q)
    const likes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))

    const profiles = []
    for (const like of likes) {
      try {
        const profileSnap = await getDoc(doc(db, 'profiles', like.fromUserId))
        if (profileSnap.exists()) {
          profiles.push({
            ...profileSnap.data(),
            id: like.fromUserId,
            likeType: like.likeType,
            matched: like.matched,
            createdAt: like.createdAt
          })
        }
      } catch (err) {
        console.error('Error fetching profile for like:', err)
      }
    }

    return profiles
  } catch (error) {
    console.error('Error fetching users who liked me:', error)
    return []
  }
}

/**
 * Get mutual matches for the current user (both parties liked each other)
 */
export async function getMutualMatches(currentUserId, likeType = null) {
  try {
    const constraints = [
      where('fromUserId', '==', currentUserId),
      where('matched', '==', true)
    ]
    if (likeType) constraints.push(where('likeType', '==', likeType))

    const snap = await getDocs(query(collection(db, 'likes'), ...constraints))
    const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    const results = []
    for (const match of matches) {
      try {
        const profileSnap = await getDoc(doc(db, 'profiles', match.toUserId))
        if (!profileSnap.exists()) continue

        // Find the conversation for this match
        const convSnap = await getDocs(query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', currentUserId),
          where('likeType', '==', match.likeType)
        ))
        const conv = convSnap.docs.find(d => d.data().participants.includes(match.toUserId))

        results.push({
          ...profileSnap.data(),
          id: match.toUserId,
          likeType: match.likeType,
          matched: true,
          createdAt: match.createdAt,
          conversationId: conv?.id || null
        })
      } catch (err) {
        console.error('Error fetching match profile:', err)
      }
    }

    return results
  } catch (error) {
    console.error('Error fetching mutual matches:', error)
    return []
  }
}
