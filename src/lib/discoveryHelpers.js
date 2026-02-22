import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Get profiles of other users for discovery
 * Excludes current user, already-liked, already-passed, and session-passed users
 * @param {Object} options - { includePassed: boolean } When true, don't exclude Firestore passes (for "See All Profiles Again")
 */
export async function getDiscoveryProfiles(currentUserId, excludeUserIds = [], maxResults = 20, options = {}) {
  const { includePassed = false } = options

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
