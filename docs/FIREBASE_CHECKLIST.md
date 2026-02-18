# Firebase Console – what to check when sign-in fails

Walk through these in order. Each section is a place in the Firebase Console that could be set wrong.

---

## 1. Project and app config (Project Settings)

**Where:** Firebase Console → click the **gear icon** next to “Project Overview” → **Project settings**.

### 1.1 Your apps (Web app)

- You should see at least **one Web app** (nickname e.g. “Sapph Web”) with an **App ID** like `1:123456789:web:abc123`.
- If there is **no Web app**: click **Add app** → **Web** (`</>`) → register with a nickname → you’ll get a config object.
- **Copy the config** and make sure your **`.env`** has every value (see 1.2). The app uses:
  - **API Key** → `VITE_FIREBASE_API_KEY`
  - **Auth domain** → `VITE_FIREBASE_AUTH_DOMAIN` (e.g. `your-project.firebaseapp.com`)
  - **Project ID** → `VITE_FIREBASE_PROJECT_ID`
  - **Storage bucket** → `VITE_FIREBASE_STORAGE_BUCKET` (e.g. `your-project.appspot.com`)
  - **Messaging sender ID** → `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - **App ID** → `VITE_FIREBASE_APP_ID`

**Wrong:** No Web app, or you’re using config from a different project/app.

### 1.2 Match your .env

In your project folder, open **`.env`** and confirm:

- Every variable above is set (no empty values).
- **Auth domain** is exactly like in the console (usually `your-project-id.firebaseapp.com`), no `https://` and no path.
- **Project ID** matches the Firebase project you’re looking at.

**Wrong:** Missing variables, typos, or values from another project.

---

## 2. Authentication – Sign-in method

**Where:** Firebase Console → **Authentication** (left sidebar) → **Sign-in method** tab.

### 2.1 Email/Password

- **Email/Password** row must be **Enabled** (toggle ON).
- “Email link (passwordless sign-in)” can stay **disabled** unless you use it.

**Wrong:** Email/Password is disabled → email sign-in and “forgot password” will fail.

### 2.2 Google

- Click **Google** in the list.
- **Enable** (toggle ON).
- Set **Project support email** (required).
- **Web SDK configuration**: “Web client ID” and “Web client secret” are optional for the Firebase JS SDK; the SDK uses the project’s default. You don’t need to paste a separate client ID unless you’re using a different OAuth client.

**Wrong:** Google is disabled → “Continue with Google” will fail.

### 2.3 Apple

- Click **Apple** in the list.
- **Enable** (toggle ON).
- Fill in **Apple Services ID**, **Apple Team ID**, **Apple Key ID**, **Private key** (and **Key ID** / **Bundle ID** if shown). These come from your Apple Developer account and App ID / Services ID.
- If any of these are missing or wrong, Apple sign-in will fail.

**Wrong:** Apple disabled or Apple configuration incomplete/incorrect → “Continue with Apple” will fail.

---

## 3. Authentication – Authorized domains

**Where:** Firebase Console → **Authentication** → **Settings** (or **Settings** in the Auth section) → **Authorized domains** tab.

Firebase only allows auth requests from domains listed here.

- You should see at least:
  - **`localhost`** (for local dev and for many dev tools).
  - **`your-project.firebaseapp.com`** (often added by default).
- If your **web app** or **Capacitor app** loads from a real URL (e.g. `https://app.yourapp.com`), that **exact domain** must be in the list (e.g. `app.yourapp.com`).

**Wrong:**

- The domain your app actually runs on is **not** in the list → Firebase will block auth (CORS / “domain not allowed”).
- For **Capacitor iOS**: the in-app WebView uses `capacitor://localhost`, which **cannot** be added here (Firebase only allows http/https domains). So auth from the bundled app can be blocked until you either load the app from an https URL (and add that domain) or use native auth plugins.

---

## 4. Authentication – Templates (optional)

**Where:** Firebase Console → **Authentication** → **Templates** tab.

- **Password reset**: Used for “Forgot password?”. Default template works; you can change text/sender name.
- **Email address verification**: Only matters if you require email verification before sign-in.

**Wrong:** Usually not the cause of “all options fail”; more about email content and verification flow.

---

## 5. Authentication – User provider / settings

**Where:** Firebase Console → **Authentication** → **Users** tab (and any “Settings” under Auth).

- **Sign-in providers**: Already covered in section 2.
- **User account management**: No setting here should block sign-in unless you’ve turned on something strict (e.g. “Block sign-in” for a provider).
- **Authorized domains**: Already covered in section 3.

---

## 6. Firestore Database

**Where:** Firebase Console → **Firestore Database**.

### 6.1 Database exists

- You should have **one Firestore database** (e.g. in `(default)`).
- If it says “Create database”, create it and pick a location (e.g. same as other Google services).

**Wrong:** No database → profile reads/writes (e.g. after sign-in) will fail.

### 6.2 Rules

- **Rules** tab: For development you might use test mode (open read/write for a limited time). For production you need rules that allow reads/writes only for authenticated users (and only their own data where appropriate).
- If rules are too strict (e.g. `allow read, write: if false;`), the app will get permission errors after sign-in when loading/updating profiles.

**Wrong:** Rules deny read/write for your app’s requests → profile or other Firestore operations fail (often after auth succeeds).

---

## 7. Storage

**Where:** Firebase Console → **Storage**.

### 7.1 Bucket exists

- **Files** tab: Bucket should exist (often created when you click “Get started” in Storage).
- Your `.env` **Storage bucket** should match (e.g. `your-project.appspot.com`).

**Wrong:** No bucket or wrong bucket name in config → photo uploads or other storage calls fail.

### 7.2 Rules

- **Rules** tab: Same idea as Firestore – test mode for dev, proper rules for production (e.g. only authenticated users, only their own paths).

**Wrong:** Rules deny upload/read → storage operations fail.

---

## 8. Quick checklist (copy and tick)

- [ ] **Project settings**: Web app exists; config copied; `.env` has all `VITE_FIREBASE_*` with correct values and no typos.
- [ ] **Auth → Sign-in method**: Email/Password **Enabled**; Google **Enabled** (and configured); Apple **Enabled** (and fully configured in Apple Developer + here).
- [ ] **Auth → Authorized domains**: Includes `localhost` and the exact domain your app runs on (if it’s a real URL). (Capacitor bundled app: see note in section 3.)
- [ ] **Firestore**: Database created; rules allow the operations your app does (e.g. read/write `profiles` for authenticated users).
- [ ] **Storage**: Bucket exists; rules allow the operations your app does (e.g. upload/read for authenticated users).

If **all sign-in options** fail, the most likely places are **1 (config / .env)** and **3 (Authorized domains)**. Fix those first, then re-check **2 (Sign-in method)** for the providers you use.
