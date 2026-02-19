# UID/Profile ID Mismatch - Debugging Guide

## The Problem

**User UID and Profile ID don't match** - This is a critical issue that prevents saves from working.

## Why This Matters

The Firestore security rules require:
```javascript
allow write: if request.auth != null && request.auth.uid == userId;
```

This means:
- The **document ID** (`profiles/{userId}`) must match the **authenticated user's UID**
- If they don't match, writes will be **permission-denied**

## How It Should Work

1. User signs in → Firebase Auth creates user with UID (e.g., `abc123xyz`)
2. Profile document created → `profiles/abc123xyz` (document ID = user UID)
3. All saves go to → `profiles/abc123xyz`
4. Security rules check → `request.auth.uid == userId` → ✅ Match!

## How to Check for Mismatch

### Step 1: Check Firebase Console

1. Go to **Firebase Console** → **Authentication** → **Users**
2. Find your test user
3. Note the **UID** (e.g., `abc123xyz`)

4. Go to **Firestore Database** → **profiles** collection
5. Find the profile document
6. Check the **Document ID** (should match the UID)

**If they don't match:** That's the problem!

### Step 2: Check Console Logs

After the latest update, the code now logs:
- `[Onboarding] Saving profile for user ID: <uid>`
- `[Onboarding] Profile document path: profiles/<uid>`
- `[Onboarding] ✅ Verification: Document ID = <id>`
- `[Onboarding] ❌ UID MISMATCH: Document ID (...) does not match user ID (...)`

Look for these messages in Safari Web Inspector or Xcode console.

### Step 3: Check for Multiple Profiles

Sometimes multiple profile documents exist:
- One with correct UID
- One with wrong ID (maybe from old code)

**Solution:** Delete the wrong one in Firestore Console.

## Common Causes

### 1. Profile Created with Wrong ID

**Old code might have done:**
```javascript
// WRONG - creates random ID
const profileRef = doc(collection(db, 'profiles'))
setDoc(profileRef, { ... })
```

**Correct code:**
```javascript
// CORRECT - uses user UID as document ID
const profileRef = doc(db, 'profiles', user.id)
setDoc(profileRef, { ... })
```

### 2. User ID Not Available

**If `user.id` is undefined/null:**
- Profile might be created with wrong ID
- Or save fails silently

**Check:** Console logs will show `[Onboarding] Saving profile for user ID: undefined`

### 3. Multiple Sign-Ins

**If user signs in/out multiple times:**
- Old profile might exist with different ID
- New profile created with correct ID
- But app reads wrong one

**Solution:** Check Firestore for duplicate profiles, delete old ones.

## How to Fix

### Option 1: Delete Wrong Profile (Recommended)

1. Go to **Firestore Console** → **profiles**
2. Find profile with **wrong document ID**
3. Delete it
4. Complete onboarding again (will create new profile with correct ID)

### Option 2: Migrate Data

If you need to keep the data:

1. Copy data from wrong profile document
2. Create new document with correct UID: `profiles/{correctUID}`
3. Paste data
4. Delete old document

### Option 3: Fix in Code (If Bug Exists)

If the code is creating profiles with wrong IDs, we need to fix it. But based on current code, it should be using `user.id` correctly.

## Verification After Fix

After fixing, verify:

1. **Complete onboarding** → Check console logs
2. **Check Firestore** → Document ID should match user UID
3. **Check `onboarding_completed`** → Should be `true`
4. **Restart app** → Should go to `/home` (not `/onboarding`)

## Current Code Verification

The code now:
- ✅ Uses `user.id` (which is `firebaseUser.uid`) for document ID
- ✅ Verifies document ID matches user ID after save
- ✅ Logs detailed error messages if mismatch detected
- ✅ Shows clear error to user if save fails

## Next Steps

1. **Check console logs** when completing onboarding
2. **Check Firestore** for UID mismatch
3. **Delete wrong profile** if exists
4. **Try onboarding again** with correct UID
