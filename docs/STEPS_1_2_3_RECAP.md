# Steps 1–3 recap: What we're building and what was added

## Step 1: What we're building

- **Create account** in the app no longer uses `createUserWithEmailAndPassword` in the WebView (which fails from `capacitor://localhost`).
- The app calls a **Firebase Cloud Function** over HTTPS with `{ email, password }`.
- The function creates the user with the **Firebase Admin SDK** and returns a **custom token**.
- The app calls **`signInWithCustomToken(auth, token)`** and the user is signed in.
- All of this stays inside Firebase (no separate server).

## Step 2: What was added

- **`firebase.json`** – tells Firebase CLI about your `functions` folder.
- **`.firebaserc`** – links this folder to your Firebase project (replace `your-project-id` with your real project ID, or run `firebase use <project-id>`).
- **`functions/package.json`** – dependencies for Cloud Functions (`firebase-functions`, `firebase-admin`).

## Step 3: What was added

- **`functions/index.js`** – a callable function **`createAccountWithToken`** that:
  - Accepts `{ email, password }`.
  - Validates input (required, password length ≥ 6).
  - Creates the user with `admin.auth().createUser({ email, password })`.
  - Returns `{ customToken }` from `admin.auth().createCustomToken(uid)`.
  - Returns clear errors (e.g. email already exists, invalid email).

Next: install function dependencies (`cd functions && npm install`), set your project in `.firebaserc` or `firebase use`, then deploy with `firebase deploy --only functions`. After that we wire the app to call this function and use `signInWithCustomToken`.

---

## Native app fix (no long waits / no freeze)

- The function is **1st gen** (`firebase-functions/v1`) so it has a **predictable URL**: `https://us-central1-PROJECT.cloudfunctions.net/createAccountWithToken`.
- On **native**, the app calls that URL with **CapacitorHttp** (native HTTP, no WebView/CORS), so the request completes instead of hanging.
- **You must redeploy** after the 1st-gen change: run `firebase deploy --only functions` from the project root. Then rebuild the app (`npm run build && npx cap sync ios`) and run from Xcode.
- If you ever deploy as 2nd gen, set **`VITE_FIREBASE_CREATE_ACCOUNT_URL`** in `.env` to the function URL from Firebase Console, and the app will use that on native.
