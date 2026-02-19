# Onboarding redirect back to "Let's get started" – causes and solutions

## What was happening

After completing the profile and saving, the app sometimes sent you back to the start of onboarding instead of the homepage.

## Possible causes

### 1. **Hash change causing reload (native)**

On native we were doing `navigate('/home')` then `window.location.hash = '#/home'`.  
Changing the hash can make the WebView reload the page. On reload:

- The app remounts and AuthContext runs again.
- Profile is set to the minimal `{ id, onboarding_completed: false }` until `fetchProfile` finishes.
- You end up on `#/` or `#/home` with `profile.onboarding_completed === false`.
- Either **SplashOrRedirect** (at `/`) or **Home** (at `/home`) sees that and redirects to `/onboarding`.

### 2. **React state not committed before navigation**

We called `updateProfile({ onboarding_completed: true })` then immediately `navigate('/home')`.  
React state updates are async. If the navigation and Home’s first render happen before the state update is committed, Home can still see `profile.onboarding_completed === false` and redirect.

### 3. **Landing on "/" instead of "/home" after reload**

If after a reload the URL is the root (e.g. `#/` or no hash), **SplashOrRedirect** renders. It only has the minimal profile with `onboarding_completed: false`, so it redirects to `/onboarding` and you never reach Home.

### 4. **location.state lost on native**

We tried passing `state: { fromOnboardingComplete: true }` with `navigate()`. On native, when the hash changes or the WebView reloads, React Router’s `location.state` can be lost, so Home never sees “just completed onboarding”.

## Solutions implemented

### 1. **sessionStorage flag**

- When the user finishes onboarding we set  
  `sessionStorage.setItem('onboardingComplete', user.id)`  
  before navigating.
- This survives:
  - Hash changes
  - Page reloads
  - Any remount that resets React state

So even if the app reloads or state is reset, we still know “this user just completed onboarding”.

### 2. **AuthContext uses the flag when building minimal profile**

When a signed-in user is detected and we set the minimal profile (before `fetchProfile` returns), we check:

- If `sessionStorage.getItem('onboardingComplete') === firebaseUser.uid`  
  we set `onboarding_completed: true` (and then remove the key).  
So the first profile the app sees after a reload can already be “completed”.

### 3. **SplashOrRedirect uses the flag**

If the user is signed in and we would normally send them to onboarding because `profile.onboarding_completed === false`, we first check the sessionStorage flag. If it’s set for this user, we send them to **Home** instead of **Onboarding**.

### 4. **Home uses the flag**

- When deciding whether to redirect to onboarding, we skip the redirect if the sessionStorage flag is set for the current user.
- When deciding whether to load discovery, we treat “just completed” (flag set) as completed so the feed still loads.

### 5. **No more `window.location.hash` on finish**

We only call `navigate('/home', { replace: true })` and no longer set `window.location.hash = '#/home'`. That avoids triggering an unnecessary reload on native.

### 6. **Cleaning up the flag**

- When we later load the full profile from Firestore and it has `onboarding_completed: true`, we call `sessionStorage.removeItem('onboardingComplete')` so we don’t rely on the flag forever.

## Summary

- **Cause:** Reload or hash change reset state; minimal profile and lost `location.state` made the app think onboarding wasn’t done.
- **Fix:** A sessionStorage flag that survives reload/hash + using it in AuthContext, SplashOrRedirect, and Home, and no longer changing the hash when finishing onboarding.
