# Why Profiles Fail to Load on Home Tab

## Root Cause: Firestore Security Rules Block Discovery Query

The main issue is that **Firestore security rules prevent reading other users' profiles**, but the discovery query needs to read ALL profiles to find matches.

## The Problem

### Current Security Rules
```javascript
match /profiles/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

This rule says: **"Users can only read their own profile"**

### What the Discovery Query Tries to Do
```javascript
const q = query(
  profilesRef,
  where('onboarding_completed', '==', true),
  limit(maxResults)
)
```

This query tries to: **"Read ALL profiles where onboarding_completed is true"**

### The Conflict
- Security rules: "You can only read YOUR profile"
- Discovery query: "I need to read EVERYONE'S profiles"
- **Result**: Permission denied ❌

## Why It Fails Silently

The error is caught and returns an empty array:

```javascript
} catch (error) {
  console.error('[getDiscoveryProfiles] Error:', error.code || error.message)
  return [] // Returns empty array, so UI shows "No more profiles"
}
```

So the app shows "No more profiles" instead of an error message.

## Additional Issues

### 1. Missing Firestore Index
The query `where('onboarding_completed', '==', true)` requires a Firestore index. If missing, you'll get:
- Error code: `failed-precondition`
- Message: "The query requires an index"

### 2. Network Timeout
On slow networks or native apps, the query might timeout (15 seconds), causing:
- Error: "Profile load timeout"
- Result: Empty profiles array

### 3. No Profiles Exist
If no other users have completed onboarding:
- Query succeeds but returns 0 results
- After filtering current user, array is empty
- Shows "No more profiles" (this is correct behavior)

## Solutions

### Solution 1: Update Firestore Security Rules (RECOMMENDED)

Allow authenticated users to read profiles for discovery:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Profiles - users can read all profiles (for discovery), write only their own
    match /profiles/{userId} {
      allow read: if request.auth != null; // Allow reading any profile
      allow write: if request.auth != null && request.auth.uid == userId; // Only write own profile
    }
    
    // ... rest of your rules
  }
}
```

**Why this is safe:**
- Users can only READ profiles (not modify)
- Users can only WRITE their own profile
- Profile data is meant to be discoverable (like a dating app)

### Solution 2: Create Firestore Index

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection: `profiles`
4. Fields:
   - `onboarding_completed` (Ascending)
5. Click "Create"

Or click the error link in the console when the query fails - Firebase will provide a direct link to create the index.

### Solution 3: Add Better Error Handling

Show actual error messages instead of silently failing:

```javascript
} catch (error) {
  console.error('[getDiscoveryProfiles] Error:', error.code || error.message)
  
  if (error.code === 'permission-denied') {
    console.error('[getDiscoveryProfiles] Permission denied! Update Firestore security rules to allow reading profiles.')
  } else if (error.code === 'failed-precondition') {
    console.error('[getDiscoveryProfiles] Missing Firestore index! Create index for: profiles/onboarding_completed')
  }
  
  return []
}
```

## How to Debug

### Check Console Logs
Look for these error messages:
- `[getDiscoveryProfiles] Error: permission-denied`
- `[getDiscoveryProfiles] Missing Firestore index!`
- `[Home] Error loading discovery profiles: ...`

### Test Firestore Query Directly
1. Go to Firebase Console → Firestore Database
2. Try querying `profiles` collection
3. Check if you can see other users' profiles
4. If not, security rules are blocking it

### Check Network Tab
1. Open browser DevTools → Network tab
2. Filter by "firestore.googleapis.com"
3. Look for failed requests with 403 (permission denied) or 400 (missing index)

## Current Code Flow

1. **Home component** calls `getDiscoveryProfiles(user.id, passedUserIds, 50)`
2. **getDiscoveryProfiles** queries Firestore: `where('onboarding_completed', '==', true)`
3. **Firestore security rules** check: "Can this user read other profiles?"
4. **Rules say NO** → Returns permission-denied error
5. **Error is caught** → Returns empty array `[]`
6. **Home component** receives empty array → Shows "No more profiles"
7. **User sees** "No more profiles" instead of error message

## Recommended Fix

**Update Firestore security rules** to allow reading profiles:

```javascript
match /profiles/{userId} {
  allow read: if request.auth != null; // Allow reading any profile for discovery
  allow write: if request.auth != null && request.auth.uid == userId; // Only write own profile
}
```

This is the standard pattern for dating/social apps where profiles need to be discoverable.
