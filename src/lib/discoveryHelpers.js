import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Get profiles of other users for discovery
 * Excludes current user and users already liked/passed
 */
export async function getDiscoveryProfiles(currentUserId, excludeUserIds = [], maxResults = 20) {
  try {
    const profilesRef = collection(db, 'profiles')
    
    // Get all profiles that have completed onboarding
    const q = query(
      profilesRef,
      where('onboarding_completed', '==', true),
      limit(maxResults)
    )
    
    const snapshot = await getDocs(q)
    const profiles = []
    
    for (const docSnap of snapshot.docs) {
      const profileData = docSnap.data()
      const profileId = docSnap.id
      
      // Skip current user and excluded users
      if (profileId === currentUserId || excludeUserIds.includes(profileId)) {
        continue
      }
      
      // Only include profiles with at least a name
      if (profileData.full_name) {
        profiles.push({
          id: profileId,
          ...profileData
        })
      }
    }
    
    // Shuffle for variety
    return profiles.sort(() => Math.random() - 0.5)
  } catch (error) {
    console.error('[getDiscoveryProfiles] Error:', error.code || error.message)
    // If it's a missing index error, log helpful message
    if (error.code === 'failed-precondition') {
      console.error('[getDiscoveryProfiles] Missing Firestore index! Create index for: profiles/onboarding_completed')
    }
    return []
  }
}

/**
 * Get users who have liked the current user
 */
export async function getUsersWhoLikedMe(currentUserId, likeType = null) {
  try {
    const likesRef = collection(db, 'likes')
    let q
    
    if (likeType) {
      q = query(
        likesRef,
        where('toUserId', '==', currentUserId),
        where('likeType', '==', likeType)
      )
    } else {
      q = query(
        likesRef,
        where('toUserId', '==', currentUserId)
      )
    }
    
    const snapshot = await getDocs(q)
    const likes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Fetch profile data for each user who liked
    const profiles = []
    for (const like of likes) {
      try {
        const profileRef = doc(db, 'profiles', like.fromUserId)
        const profileSnap = await getDoc(profileRef)
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
