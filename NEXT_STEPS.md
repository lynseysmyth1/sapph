# Sapph App — Next Steps Roadmap

A practical guide to turning your prototype into a **React + Capacitor** native app for iOS and Android, with database, push notifications, camera, and location.

---

## Phase 1: Foundation (Do This First)

### 1.1 Bring your prototype into this project
- If your prototype is a **React** app (Create React App, Vite, Next.js, etc.):
  - Copy or move the prototype code into this folder (or create the app here and copy components/styles in).
- If it’s **plain HTML/CSS/JS** or another framework:
  - You’ll create a new React app in this folder and rebuild the UI from your prototype (reusing layout, colours, and flows).

**Recommendation:** Use **Vite + React** for a fast, modern setup that works well with Capacitor.

### 1.2 Set up the React app (if starting fresh)
```bash
npm create vite@latest . -- --template react
npm install
```
Then install Capacitor:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```
When prompted:
- **App name:** Sapph (or your chosen name)
- **App ID:** e.g. `com.sapph.app` (must be unique; you’ll use this for stores)
- **Web asset directory:** `dist` (for Vite)

### 1.3 Add native platforms
```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

**You will need:**
- **macOS** with **Xcode** (from Mac App Store) for iOS builds and App Store submission.
- **Android Studio** (for Android builds and Play Store). Can be on Mac or Windows.

---

## Phase 2: Native features (Capacitor plugins)

Install the plugins you need:

| Feature | Plugin | Command |
|--------|--------|---------|
| Camera (photos, QR) | `@capacitor/camera` | `npm install @capacitor/camera` |
| Push notifications | `@capacitor/push-notifications` | `npm install @capacitor/push-notifications` |
| Location / GPS | `@capacitor/geolocation` | `npm install @capacitor/geolocation` |
| Local storage / preferences | `@capacitor/preferences` | `npm install @capacitor/preferences` |

Then sync to native projects:
```bash
npm run build
npx cap sync
```

**Permissions:** You’ll configure camera and location in:
- **iOS:** `ios/App/App/Info.plist`
- **Android:** `android/app/src/main/AndroidManifest.xml`

---

## Phase 3: Backend and database

You need a backend so that **profiles, messages, and user data** are stored and synced across devices.

### Option A — Backend-as-a-Service (fastest)
- **Firebase (Firestore + Auth):** Good for profiles, real-time messages, and “user accounts with data syncing.” Works well with Capacitor.
- **Supabase:** PostgreSQL + Auth + real-time; very flexible and open source.

### Option B — Your own backend
- **Node.js (Express/Fastify) + database (e.g. PostgreSQL)** on a server or serverless (e.g. Railway, Render, AWS).
- React app talks to your API; Capacitor app uses the same API.

**For a dating app you’ll typically need:**
- User accounts (sign up / login).
- Profiles (photos, bio, preferences).
- Matching / discovery logic.
- Messaging (often real-time).
- Moderation and safety (reporting, blocking).

Start with one backend (e.g. Firebase or Supabase) and add **REST or SDK** calls from your React app.

---

## Phase 4: Push notifications (required for “alerts”)

- **iOS:** Apple Developer account ($99/year). Create an App ID, enable Push Notifications, create a key/certificate. Use Firebase Cloud Messaging (FCM) or Apple Push Notification service (APNs) with a backend.
- **Android:** Google Play Console + FCM. Usually free.
- **Backend:** A service (e.g. Firebase, OneSignal, or your own server) that sends push payloads to FCM/APNs when you want to “alert users.”

Capacitor’s `@capacitor/push-notifications` handles receiving and displaying notifications in the app; the backend handles sending.

---

## Phase 5: Build and run locally

1. **Build web assets**
   ```bash
   npm run build
   npx cap sync
   ```

2. **iOS (Mac only)**
   ```bash
   npx cap open ios
   ```
   In Xcode: pick a simulator or device, then Run.

3. **Android**
   ```bash
   npx cap open android
   ```
   In Android Studio: pick emulator or device, then Run.

Use **Live Reload** during development so changes in React show up in the app without full rebuilds (Capacitor docs describe this).

---

## Phase 6: App Store and Play Store

### Apple App Store
- Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
- In Xcode: set correct **Bundle ID** (same as your Capacitor App ID), version, and signing team.
- Create the app in App Store Connect; add metadata, screenshots, privacy policy.
- Archive and upload via Xcode (or CI); submit for review.

### Google Play Store
- Create a [Google Play Developer account](https://play.google.com/console) (one-time fee).
- In Android Studio: set **applicationId**, version, and signing config.
- Create the app in Play Console; add store listing, screenshots, privacy policy.
- Build an AAB (Android App Bundle), upload, and submit.

**Both stores require:** privacy policy URL, app icons, screenshots, and often a description of how you use camera, location, and notifications (for permission justifications).

---

## Suggested order of work

1. Get your **React app** (prototype or new) running in this project.
2. **Init and add Capacitor** (iOS + Android); run in simulator/emulator.
3. Add **one backend** (e.g. Firebase or Supabase) and implement **auth + profiles**.
4. Integrate **camera** and **location** with Capacitor plugins and permissions.
5. Implement **messaging** and **notifications** (push) with your backend/FCM.
6. Polish UI/UX and **performance** (lazy loading, image optimisation, smooth navigation).
7. Set up **store developer accounts** and prepare **store listings**.
8. **Build release** versions and submit to App Store and Play Store.

---

## Quick reference: useful commands

```bash
# Build web app
npm run build

# Sync web build into native projects
npx cap sync

# Open native IDEs
npx cap open ios
npx cap open android

# Update Capacitor and plugins (after adding new plugins)
npx cap update
```

---

## Summary

| Goal | Next step |
|------|-----------|
| Use your existing prototype | Move/copy prototype into this repo or recreate UI in a new React (Vite) app here. |
| Native iOS/Android | Add Capacitor, then `cap add ios` and `cap add android`; install Xcode and Android Studio. |
| Camera, location, notifications | Add `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/push-notifications` and wire up in React. |
| User accounts + data | Choose Firebase or Supabase (or your own API) and implement auth + profiles + messages. |
| Publish | Enroll in Apple + Google developer programs; configure signing and store listings; submit builds. |

If you tell me whether your prototype is already in React and where it lives, the next concrete step can be: “Set up Vite + React + Capacitor in this folder” or “Integrate your existing React app with Capacitor in this folder,” and we can do that step by step.
