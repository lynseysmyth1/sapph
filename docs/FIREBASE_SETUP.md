# Firebase Setup for Sapph – Quick Start

This guide will help you set up Firebase for authentication, database (Firestore), and storage.

---

## Step 1: Create a Firebase Project

1. Go to **[Firebase Console](https://console.firebase.google.com/)**
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: **"Sapph"** (or your preferred name)
4. Click **Continue**
5. **Disable Google Analytics** (optional, you can enable later)
6. Click **Create project**
7. Wait for project creation (takes ~30 seconds)
8. Click **Continue**

---

## Step 2: Enable Authentication (Email/Password)

1. In your Firebase project, click **Authentication** in the left sidebar
2. Click **Get started** (if first time)
3. Click the **Sign-in method** tab
4. Click **Email/Password**
5. **Enable** "Email/Password" (toggle ON)
6. **Disable** "Email link (passwordless sign-in)" (optional - we're using passwords)
7. Click **Save**

**Note:** For now, we're only using email/password. Google/Apple sign-in can be added later.

**Forgot password:** No extra switch is needed. The app uses Firebase’s “send password reset email”; the same Email/Password provider handles it. Optional in Firebase Console:
- **Authentication → Templates** – edit the “Password reset” email (text, sender name, link).
- **Authentication → Settings → Authorized domains** – ensure your app’s domain (and `localhost` for dev) is listed so the reset link works.

---

## Step 3: Create Firestore Database

1. Click **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **"Start in test mode"** (for development)
4. Click **Next**
5. Choose a location (pick closest to you, e.g., `us-central1`)
6. Click **Enable**

**Security Rules:** Test mode allows read/write for 30 days. We'll set up proper rules later.

---

## Step 4: Enable Storage

1. Click **Storage** in the left sidebar
2. Click **Get started**
3. Choose **"Start in test mode"** (for development)
4. Click **Next**
5. Use the same location as Firestore
6. Click **Done**

---

## Step 5: Get Your Firebase Config

1. Click the **gear icon** (⚙️) next to "Project Overview" at the top
2. Click **Project settings**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** (`</>`)
5. Register app:
   - App nickname: **"Sapph Web"**
   - Click **Register app**
6. **Copy the config object** - it looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

---

## Step 6: Add Config to Your Project

1. In your project folder, open **`.env`** file (create it if it doesn't exist)
2. Add these lines (replace with your values from Step 5):
   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```
3. **Save** the file
4. **Restart your dev server** (`npm run dev`)

---

## Step 7: Set Up Firestore Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules** tab
2. Replace the rules with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Profiles collection - users can only read/write their own profile
       match /profiles/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
3. Click **Publish**

---

## Step 8: Set Up Storage Security Rules

1. In Firebase Console, go to **Storage** → **Rules** tab
2. Replace the rules with:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       // Profile photos - users can upload/read their own photos
       match /profile-photos/{userId}/{allPaths=**} {
         allow read: if true; // Public read
         allow write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
3. Click **Publish**

---

## Test It!

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Open your app** at `http://localhost:5173`

3. **Try signing up:**
   - Click **Enter** → **Sign in**
   - Enter email and password
   - Click **Sign in / Create account**
   - You should be signed in immediately!

4. **Complete onboarding:**
   - Fill out the onboarding form
   - Upload photos (optional)
   - Click **Finish**
   - Your profile should save successfully!

---

## Troubleshooting

**"Firebase: Error (auth/invalid-api-key)"**
- Check your `.env` file has all Firebase config values
- Make sure there are no extra spaces or quotes
- Restart your dev server after changing `.env`

**"Permission denied"**
- Check Firestore and Storage security rules are published
- Make sure you're signed in

**"Storage bucket not found"**
- Make sure Storage is enabled in Firebase Console
- Check `VITE_FIREBASE_STORAGE_BUCKET` in `.env` matches your project

**Photos not uploading**
- Check Storage security rules allow uploads
- Check browser console for errors
- Make sure file size isn't too large (Firebase free tier: 5GB total)

---

## Next Steps

- ✅ Email/password authentication is working
- 🔜 Add Google sign-in (optional)
- 🔜 Add Apple sign-in (optional, needed for iOS app)
- 🔜 Set up proper Firestore indexes for queries
- 🔜 Configure Firebase Hosting (for production)

---

## Free Tier Limits

Firebase free tier (Spark plan) includes:
- **Authentication:** 50K MAU (Monthly Active Users)
- **Firestore:** 1GB storage, 50K reads/day, 20K writes/day
- **Storage:** 5GB storage, 1GB downloads/day

This is plenty for development and early testing!
