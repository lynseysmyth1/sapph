# Why the App Has Issues Saving Profiles

## Root Causes

### 1. **Network Latency in Native Apps**
When your app runs in a native iOS WebView (TestFlight), network requests are slower than on desktop:
- **Mobile networks** (cellular/WiFi) have higher latency than desktop connections
- **Firestore writes** require a round-trip to Firebase servers (often 200-2000ms+ on mobile)
- **iOS WebView** adds overhead compared to native network calls

### 2. **Large Payload Size**
The onboarding profile payload can be large:
- Multiple text fields (name, bio, conversation_starter, etc.)
- Arrays (pronouns, connection_goals, relationship_style, etc.)
- Visibility settings object
- Photo URLs array
- All sent in a single Firestore write operation

**Example payload size:** ~2-5KB of JSON data, which can take 1-3 seconds to write on slow networks.

### 3. **Firebase Hosting Overhead**
Your app loads from `https://sapph-b4f8e.web.app`:
- Each Firestore write goes: **Device → Firebase Hosting → Firebase Firestore**
- This adds extra network hops compared to a native app making direct Firebase calls
- The HTTPS connection must be established/maintained

### 4. **Page Reload Interrupting Saves**
The current implementation navigates immediately:
```javascript
window.location.hash = '#/home';
setTimeout(() => window.location.reload(), 200);
```
If the page reloads before the Firestore write completes, the save might be interrupted or appear to fail.

### 5. **No Offline Persistence**
Firestore has offline persistence, but:
- It's not enabled by default in your config
- Even if enabled, the first write still needs network
- If the network is slow/unstable, writes can timeout

## What We've Done to Fix It

### ✅ **Optimistic Save (Current Implementation)**
- **Fire-and-forget approach**: Save starts but doesn't wait for completion
- **Immediate navigation**: User goes to `/home` right away
- **Background retry**: If save fails, retries once after 2 seconds
- **Background photo upload**: Photos upload separately after navigation

**Pros:**
- User doesn't wait
- App feels fast
- Save happens in background

**Cons:**
- No confirmation that save succeeded
- User might navigate away before save completes
- Page reload might interrupt the save

### ⚠️ **Why You're Still Seeing "Save is taking too long"**

This error message appears when:
1. The save promise rejects (network error, permission denied, etc.)
2. The retry also fails
3. The error handler shows the timeout message

**But wait** - we removed the timeout! So this error is likely coming from:
- An old cached build on your device
- A different error handler somewhere
- The retry failing and showing an error

## Solutions to Consider

### Option 1: **Enable Firestore Offline Persistence** (Recommended)
This caches writes locally and syncs when online:

```javascript
// In src/lib/firebase.js
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
```

**Benefits:**
- Writes appear instant (cached locally)
- Syncs automatically when online
- Works offline

### Option 2: **Wait for Save Confirmation Before Navigation**
Add a short timeout (2-3 seconds) to wait for save:

```javascript
const savePromise = setDoc(profileRef, immediatePayload, { merge: true });
const quickTimeout = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('save_slow')), 3000)
);

try {
  await Promise.race([savePromise, quickTimeout]);
  // Save succeeded, navigate
} catch (err) {
  if (err.message === 'save_slow') {
    // Save is slow, navigate anyway (optimistic)
  } else {
    // Real error, show message
  }
}
```

### Option 3: **Batch Writes**
Split the save into smaller chunks:
- Save critical fields first (onboarding_completed: true)
- Save other fields in background
- Update photos separately

### Option 4: **Use Firebase Realtime Database**
Realtime Database is faster for writes (but less structured):
- Lower latency
- Better for mobile networks
- But requires schema changes

## Recommended Next Steps

1. **Enable offline persistence** (Option 1) - This will make saves feel instant
2. **Add better error logging** - Log the actual error to see what's failing
3. **Remove page reload** - Use React Router navigation instead of `window.location.reload()`
4. **Add save confirmation** - Show a toast when save completes successfully

## Debugging Tips

To see what's actually happening:

1. **Check Safari Web Inspector** (on Mac, connect iPhone):
   - Look for Firestore errors in Console
   - Check Network tab for failed requests
   - Look for "permission-denied" or "unavailable" errors

2. **Add more logging**:
```javascript
setDoc(profileRef, immediatePayload, { merge: true })
  .then(() => {
    console.log('[Onboarding] ✅ Save succeeded');
  })
  .catch((saveErr) => {
    console.error('[Onboarding] ❌ Save failed:', saveErr.code, saveErr.message);
    // Log the full error
  });
```

3. **Check Firestore Security Rules**:
   - Make sure `profiles/{userId}` allows writes for authenticated users
   - Test in Firebase Console → Firestore → Rules

4. **Check Network Conditions**:
   - Test on WiFi vs cellular
   - Test with airplane mode briefly (to simulate slow network)

## Current Status

The app now uses **optimistic saves** - it fires off the save and navigates immediately. The save happens in the background, and if it fails, it retries once.

**If you're still seeing errors**, it's likely:
- An old build cached on your device (delete app, rebuild)
- A real network/permission error (check logs)
- The page reload interrupting the save (we should remove reload)
