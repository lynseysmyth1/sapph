# TestFlight sign-in – freezes and “all options give errors”

If the app **freezes** when you tap sign-in, or **every sign-in option (email, Google, Apple) gives an error**, work through this list.

**“Timed out” or “Firebase may not allow this connection”**  
Firebase Auth does not allow the in-app origin (`capacitor://localhost`). The **only way** to get sign-in and create-account working in the native app is to **load the app from an https URL** (see **§0.B** below: host the app at https, add that domain to Authorized domains, set `server.url` in `capacitor.config.json`, then rebuild).

---

## 0. **All sign-in options give errors (email + Google + Apple)**

This usually means Firebase is rejecting every auth request. Two common causes:

### A. Firebase config missing in the app (no .env at build time)

The app gets Firebase keys from **environment variables** that are baked in when you run `npm run build`. If `.env` is missing or empty when you build, the bundle has no API key and Firebase fails.

**Fix:**
1. In your project folder, ensure you have a **`.env`** file (copy from `.env.example`) with real values:
   - `VITE_FIREBASE_API_KEY=...`
   - `VITE_FIREBASE_AUTH_DOMAIN=...` (e.g. `your-project.firebaseapp.com`)
   - `VITE_FIREBASE_PROJECT_ID=...`
   - `VITE_FIREBASE_APP_ID=...`
2. Run the build **from the same machine/folder** where `.env` exists:
   ```bash
   npm run build && npx cap sync ios
   ```
3. Then archive and upload to TestFlight again. Do **not** build in a environment where `.env` is not present (e.g. a clean CI without secrets).

### B. Capacitor app origin not allowed by Firebase (capacitor://localhost)

On device, the app runs in a WebView with origin **`capacitor://localhost`**. Firebase Auth only allows **http/https domains** in **Authorized domains** (e.g. `localhost`, `yourproject.firebaseapp.com`, or your own domain). You **cannot** add `capacitor://localhost`. So Firebase may reject **all** auth requests (email, Google, Apple) with a domain/CORS error.

**Options:**

1. **Load the app from a real URL (recommended if you have a hosted app)**  
   - Host your built app on an **https** URL (e.g. `https://app.yourapp.com`).  
   - In **`capacitor.config.json`**, set the app to load from that URL, e.g.:
     ```json
     "server": { "url": "https://app.yourapp.com", "cleartext": false }
     ```
   - In **Firebase Console → Authentication → Settings → Authorized domains**, add `app.yourapp.com`.  
   - Run `npm run build`, deploy the `dist/` output to that URL, then `npx cap sync ios` and re-archive. The WebView will use that origin and Firebase will accept it.

2. **Use native auth plugins (best long-term)**  
   - Use **native** Google and Apple sign-in (e.g. `@codetrix-studio/capacitor-google-auth`, Apple Sign In capability) and then sign in to Firebase with the credential. Auth happens outside the WebView, so the `capacitor://localhost` origin is not used for the OAuth flow.  
   - Email/password can still be done in the WebView, but if Firebase is blocking **all** origins except allowed domains, email may also fail until the app loads from an allowed domain (option 1) or you use a setup that Firebase accepts.

**To confirm:** Connect the device to your Mac, open **Safari → Develop → [Your iPhone] → [Sapph WebView]** and try sign-in. In the **Console**, look for errors mentioning **CORS**, **domain**, **not allowed**, or **auth/**. That will confirm it’s a domain/config issue.

---

## 1. **Tap “Sign In” or “Create Account” (first screen) freezes**

**Possible causes**
- Main thread blocked during the state update that shows the next step (Back / Email / Google / Apple).
- React or the WebView taking too long to re-render.

**What we did**
- The handler now defers the state update with `requestAnimationFrame` so the tap returns immediately and the UI thread can process the next frame before React updates.

**If it still freezes**
- Check for **JavaScript errors**: connect your iPhone to your Mac, open **Safari → Develop → [Your iPhone] → [Sapph WebView]** and look at the Console. Any red errors there can point to the real cause.
- Try **closing and reopening** the app, then tap again in case it was a one-off hang.

---

## 2. **Tap “Continue with Google” or “Continue with Apple” freezes**

**Possible causes**
- **Redirect never starts**: The WebView may block or delay the redirect to Google/Apple, so the app appears stuck on “Signing in…”.
- **Redirect starts but return URL is wrong**: After signing in in the browser, the app might not be the target of the redirect (e.g. Firebase Authorized Domains or app URL scheme not set).
- **Firebase `signInWithRedirect`** in a WebView can be flaky on iOS; the app uses redirect (not popup) to avoid the known popup freeze.

**What we did**
- A **6-second timeout** on native: if the redirect doesn’t complete in time, we show: *“Sign-in is taking too long. Please use ‘Sign in with email’ below.”* so the UI doesn’t stay stuck.

**If it still freezes**
- **Use “Sign in with email”** for now – that path does not use redirect and should work in the app.
- In **Firebase Console → Authentication → Settings → Authorized domains**, ensure the domain your app uses is listed (e.g. the scheme/origin the WebView uses, or `localhost` for dev). Without this, the redirect may not return to the app.
- Inspect **Safari Web Inspector** (see above) for errors when you tap Google/Apple.

---

## 3. **Tap “Sign in with email” / “Create account with email” freezes**

**Possible causes**
- Opening the bottom sheet and mounting the **SignIn** (email/password) component might trigger a heavy render or an error that isn’t caught.
- A **lazy-loaded** chunk failing to load in the WebView (we keep SignIn eager, but other imports could still throw).

**If it freezes**
- Check **Safari Web Inspector** for script errors or failed network requests when you tap the email option.
- Try on **simulator** (Xcode → run on iPhone simulator) and see if the same tap freezes there; that can separate device-specific issues from code issues.

---

## 5. **General debugging steps**

1. **Safari Web Inspector**
   - iPhone: **Settings → Safari → Advanced → Web Inspector (ON)**.
   - Mac: Connect iPhone, open **Safari → Develop → [Your iPhone] → [your app’s WebView]**.
   - Reproduce the freeze and watch the **Console** for errors and the **Network** tab for failed requests.

2. **Confirm email sign-in works**
   - If **only** Google/Apple freeze but **Sign in with email** works, the issue is likely redirect/WebView for social sign-in. Use email until we switch to native Google/Apple plugins.

3. **Rebuild and reinstall**
   - From project folder: `npm run build && npx cap sync ios`, then in Xcode **Product → Archive** and upload a new build to TestFlight. Reinstall from TestFlight to ensure you’re on the latest code (including deferred tap and redirect timeout).

4. **React Strict Mode**
   - In development, React Strict Mode double-invokes some logic. It’s not enabled in production builds, but if you ever run a dev build in the app, odd behavior can occur; production TestFlight builds don’t use it.

---

## 6. **Quick workaround**

Until social sign-in is reliable in the WebView, use **“Sign in with email”** or **“Create account with email”** in the app. Email/password sign-in does not use redirect or popup and should not freeze. Google/Apple can still be used on the **web** version of the app in a normal browser.
