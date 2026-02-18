# Native app auth: root cause and the one fix

This doc explains **why** sign-in and create-account fail or time out in the iOS app, and **the only solution** that works with your current stack (React + Firebase in a Capacitor WebView).

---

## Root cause (one sentence)

**Firebase Auth only accepts requests from origins that are in Authorized domains (http/https). The native app’s WebView has origin `capacitor://localhost`, which you cannot add, so every auth call from the app is blocked or fails.**

---

## What actually happens

1. **Create account (current flow)**  
   - The app calls your Cloud Function with **CapacitorHttp** (native HTTP) → that request **can** succeed (no WebView origin).  
   - The function returns a **custom token**.  
   - The app then runs **`signInWithCustomToken(auth, customToken)`** in the WebView. That call goes to **Firebase Auth** from the WebView → origin `capacitor://localhost` → **Firebase rejects or never responds** (timeout / “Firebase may not allow this connection”).

2. **Sign in (email/password)**  
   - **`signInWithEmailAndPassword(auth, email, password)`** runs in the WebView → same origin → same block.

3. **Google / Apple**  
   - Same: the redirect or token handling ends up talking to Firebase from the WebView → same origin → same block.

So **every** path that uses Firebase Auth from the WebView is subject to this. No amount of:

- Longer timeouts  
- Different Cloud Function URLs  
- CapacitorHttp for the **first** request  

will fix it, because the **last** step (Firebase Auth token/session) always runs in the WebView and is always from `capacitor://localhost`.

---

## The only fix (load the app from https)

If the app is **loaded** from an **https** URL (e.g. `https://yourapp.web.app`), then the WebView’s origin is that https domain. Add that domain to **Firebase → Authentication → Authorized domains**, and **all** auth (create-account, sign-in, Google, Apple) works with no code changes.

So the fix is **deployment + config**, not more app logic:

1. Host the built app at an **https** URL.  
2. Add that domain to Firebase **Authorized domains**.  
3. Point Capacitor at that URL so the app **loads** from there instead of from the bundled files.

Then the WebView origin is allowed and Firebase Auth works.

---

## Step-by-step: Firebase Hosting (recommended)

You already use Firebase; Hosting is the simplest way to get an https URL.

### 1. Build and deploy the app to Firebase Hosting

Hosting is configured to use `dist/`. From the project root:

```bash
# One-time: init hosting (pick “dist” as public directory)
npx firebase-tools init hosting
# When prompted:
# - Public directory: dist
# - Single-page app: Yes
# - Don’t overwrite index.html if you already have one

# Build and deploy
npm run build
npx firebase-tools deploy --only hosting
```

After this, the app is at **`https://<project-id>.web.app`** (or the custom domain you attach).

### 2. Allow that origin in Firebase Auth

1. Open **Firebase Console** → your project.  
2. **Authentication** → **Settings** (or **Sign-in method** tab) → **Authorized domains**.  
3. Add **`<project-id>.web.app`** (and **`<project-id>.firebaseapp.com`** if listed).  
   If you use a custom domain for Hosting, add that domain instead.

### 3. Make the native app load from that URL

In **`capacitor.config.json`** (project root), set the app to load from the hosted app:

```json
{
  "appId": "com.sapph.app",
  "appName": "Sapph",
  "webDir": "dist",
  "server": {
    "url": "https://YOUR-PROJECT-ID.web.app",
    "cleartext": false
  },
  "plugins": {
    "CapacitorHttp": { "enabled": true }
  }
}
```

Replace `YOUR-PROJECT-ID` with your Firebase project ID (in your case `sapph-b4f8e`, so the URL is `https://sapph-b4f8e.web.app`).

### 4. Rebuild the native app

```bash
npm run build
npx cap sync ios
```

Open the iOS project in Xcode, archive, and upload to TestFlight. When users open the app, it will load from `https://YOUR-PROJECT-ID.web.app`. That origin is allowed in Firebase, so create-account, sign-in, and social sign-in all work.

---

## After this

- **No more** “timed out” or “Firebase may not allow this connection” from origin.  
- You can keep using the Cloud Function for create-account if you like, or switch back to **createUserWithEmailAndPassword** in the client; both work once the app is loaded from https.  
- For future deploys: run `npm run build`, then `npx firebase-tools deploy --only hosting`, then `npx cap sync ios` so the native app keeps pointing at the latest hosted build.

---

## If you can’t use Hosting

Any **https** URL works. Deploy `dist/` to Vercel, Netlify, or your own server, add that domain to Authorized domains, and set **`server.url`** in `capacitor.config.json` to that URL. Same result.

---

## Summary

| Approach | Result |
|----------|--------|
| More timeouts / CapacitorHttp / different function URLs | Does **not** fix it; the blocking step is Firebase Auth in the WebView from `capacitor://localhost`. |
| Load app from https + add domain to Authorized domains | **Fixes** it; WebView origin is then allowed and all auth works. |

The only fix is to load the app from https and add that domain to Firebase Authorized domains.
