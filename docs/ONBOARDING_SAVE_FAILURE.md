# Why onboarding_completed Wasn't Being Saved

## The Problem

You completed onboarding, but `onboarding_completed` remained `false` in Firestore. This happened because:

### Root Cause: Save Timeout + Silent Failure

1. **3-second timeout was too short** for slow networks (especially on native iOS)
2. **Navigation happened before save completed** - The code would navigate away even if the save timed out
3. **Background retry failed silently** - Errors were logged but not shown to the user
4. **No verification** - The code didn't check if the save actually succeeded

### The Flow That Failed

```
User clicks "Finish" → Save starts (3s timeout)
  ↓
Timeout after 3 seconds → Navigate to /home anyway
  ↓
Save continues in background → Fails silently
  ↓
Background retry → Also fails silently
  ↓
Result: onboarding_completed stays false in Firestore
```

## The Fix

### Changes Made

1. **Increased timeout from 3s to 10s** - Gives slow networks more time
2. **Wait for save to complete** - If timeout occurs, wait for actual save instead of navigating immediately
3. **Show errors to user** - If save fails, show error message and don't navigate
4. **Verify save succeeded** - Read back the document to confirm `onboarding_completed` was set
5. **Only navigate if save succeeded** - Don't navigate away if save failed

### New Flow

```
User clicks "Finish" → Save starts (10s timeout)
  ↓
If timeout: Wait for actual save to complete
  ↓
If save succeeds: Verify onboarding_completed is true
  ↓
Only then: Navigate to /home
  ↓
If save fails: Show error, stay on page
```

## Code Changes

### Before (Problematic)
```javascript
// 3-second timeout - too short
await Promise.race([savePromise, timeoutPromise]);
// Navigate even if save failed
navigate('/home');
```

### After (Fixed)
```javascript
// 10-second timeout - more reasonable
await Promise.race([savePromise, timeoutPromise]);
// If timeout, wait for actual save
if (timeout) await savePromise;
// Verify save succeeded
const verifySnap = await getDoc(profileRef);
// Only navigate if save succeeded
if (saveSucceeded) navigate('/home');
```

## Why This Happened

### Network Issues on Native
- Native apps (especially TestFlight) can have slower network connections
- Firebase writes can take longer than 3 seconds
- The optimistic navigation made it seem like it worked, but the save failed

### Silent Failures
- Errors were caught and logged but not shown to the user
- Background retries also failed silently
- User had no way to know the save failed

## Testing

After this fix:
1. Complete onboarding
2. Check Firestore console - `onboarding_completed` should be `true`
3. Restart app - Should go to `/home` (not `/onboarding`)
4. If save fails, you'll see an error message and can retry

## Prevention

The fix ensures:
- ✅ Save completes before navigation
- ✅ Errors are shown to the user
- ✅ Save is verified before proceeding
- ✅ Longer timeout for slow networks
- ✅ No silent failures
