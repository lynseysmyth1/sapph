# Loading Profiles & Onboarding Redirect Issues - Analysis

## Issues Identified

### Issue 1: Stuck on "Loading profiles..." Page

**Root Cause:**
1. Home component checks `!profile?.id || !completed` before loading profiles (line 99)
2. If `fetchProfile` times out (3 seconds) or fails, the profile stays as minimal: `{ id: userId, onboarding_completed: false }`
3. The `completed` check requires `profile?.onboarding_completed || sessionStorage || location.state`
4. If sessionStorage is empty and profile fetch failed, `completed` is `false`
5. BUT - if `profile?.id` exists, the condition `!profile?.id || !completed` evaluates to `!completed` (since `profile.id` exists)
6. So if `completed` is false, it returns early and never loads profiles
7. However, if `completed` somehow becomes true but profiles fail to load, it gets stuck on "Loading profiles..."

**Actual Problem:**
- The `getDiscoveryProfiles` query might be failing silently (returns empty array)
- Or the timeout (10 seconds) might be too short
- Or there's a Firestore index missing for `profiles/onboarding_completed`

### Issue 2: Redirected to Onboarding After Rebuild

**Root Cause:**
1. On rebuild/reload, `sessionStorage` is cleared (session-based storage)
2. AuthContext sets minimal profile: `{ id: userId, onboarding_completed: justCompleted }`
3. `justCompleted` checks sessionStorage, which is empty → `false`
4. `fetchProfile` is called with 3-second timeout
5. If `fetchProfile` times out or fails:
   - Profile stays as minimal: `{ id: userId, onboarding_completed: false }`
   - Home sees `profile.onboarding_completed === false` → redirects to onboarding
6. Even though the profile exists in Firestore with `onboarding_completed: true`, we never load it

**Key Problems:**
- `fetchProfile` timeout (3 seconds) might be too short on slow networks
- When `fetchProfile` fails, we keep minimal profile with wrong `onboarding_completed` value
- We rely on sessionStorage which is cleared on rebuild
- No retry mechanism for failed profile fetches

## Solutions Implemented ✅

1. **Increased `fetchProfile` timeout** from 3s to 10s for slow networks
2. **Added retry logic** - 3 attempts with exponential backoff (1s, 2s delays)
3. **Changed minimal profile** - `onboarding_completed` is now `undefined` (not `false`) until we know the real value
4. **Added fallback Firestore check** - if all retries fail, directly check Firestore for `onboarding_completed` status
5. **Fixed Home loading condition** - now properly checks for `undefined` vs `false` and waits for profile fetch
6. **Increased discovery profiles timeout** from 10s to 15s
7. **Better error handling** - improved logging and graceful degradation

## Changes Made

### AuthContext.jsx
- Minimal profile now sets `onboarding_completed: justCompleted || undefined` (not `false`)
- Profile fetch timeout increased from 3s to 10s
- Added retry logic with 3 attempts and exponential backoff
- Added fallback direct Firestore check if all retries fail
- Better error logging

### Home.jsx
- Fixed loading condition to properly handle `undefined` vs `false` for `onboarding_completed`
- Increased discovery profiles timeout from 10s to 15s
- Improved dependency array for useEffect to prevent unnecessary re-runs
- Better error handling for empty profile results
