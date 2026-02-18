# Using Firebase Cloud Functions as a backend for app sign-in (custom tokens)

You can do option B **inside Firebase** using **Cloud Functions**. Here’s what’s possible and how.

---

## What Firebase lets you do

- **Create account (sign up):** A Cloud Function can create the user with the **Firebase Admin SDK** and return a **custom token**. The app calls **`signInWithCustomToken(auth, token)`** and the user is signed in. This works from the app even when the WebView origin is `capacitor://localhost`, because the app is only calling a function URL (HTTPS) and then using the token locally.
- **Sign in (existing user):** The Admin SDK **cannot** verify a password. So you cannot safely send “email + password” to a function and have it “check password and return a custom token.” For existing users you need a different flow (see below).

So in Firebase you can:
- Use a **Cloud Function for create account** (custom token).
- For **sign in**, either use **magic link / email link** (function sends a link that leads to a custom token) or keep using the **normal Firebase Auth client** by loading the app from an **https URL** (so the origin is allowed).

---

## Part 1: Set up Cloud Functions in your Firebase project

1. Install the Firebase CLI if you haven’t:  
   `npm install -g firebase-tools`
2. Log in:  
   `firebase login`
3. In your **project folder** (or a folder you’ll use for functions):  
   `firebase init functions`
   - Pick your existing Firebase project (e.g. sapph-b4f8e).
   - Use TypeScript or JavaScript as you prefer.
   - Install dependencies when prompted.
4. You’ll get a `functions/` directory (e.g. `functions/src/index.ts`).

---

## Part 2: Create-account function (sign up with custom token)

The function will:
- Accept **email** and **password** (only over HTTPS; use this only for **create account**).
- Use the **Admin SDK** to create the user and then create a **custom token** for that UID.
- Return the token to the app; the app calls **`signInWithCustomToken(auth, token)`**.

**Example (Node/TypeScript in `functions/src/index.ts`):**

```ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const createAccountWithToken = functions.https.onCall(async (data, context) => {
  const { email, password } = data;
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Email and password required.");
  }
  const emailTrimmed = email.trim().toLowerCase();
  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: emailTrimmed,
      password,
      emailVerified: false,
    });
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    return { customToken };
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "An account with this email already exists.");
    }
    if (err.code === "auth/invalid-email") {
      throw new functions.https.HttpsError("invalid-argument", "Invalid email address.");
    }
    throw new functions.https.HttpsError("internal", err.message || "Failed to create account.");
  }
});
```

Deploy:

```bash
firebase deploy --only functions
```

**In your app (when user chooses “Create account” and submits email + password):**

- Call the callable function (e.g. `httpsCallable(functions, 'createAccountWithToken')({ email, password })`).
- On success, you get `{ customToken }`. Then:
  - `import { signInWithCustomToken } from 'firebase/auth'`
  - `await signInWithCustomToken(auth, customToken)`
- After that, use your existing post-sign-in flow (e.g. navigate to home, create profile, etc.).

So **yes, you can do the “backend” part for create account entirely in Firebase (Cloud Functions).**

---

## Part 3: Sign in (existing user) – limitation and options

Firebase Admin does **not** expose “verify this password for this email.” So you **cannot** do:

- “App sends email + password to Cloud Function → Function verifies password → Function returns custom token.”

You have two main options:

1. **Magic link / email link (all in Firebase)**  
   - User enters **email** only in the app.  
   - A Cloud Function sends an email (e.g. via **SendGrid**, **Mailgun**, or **Firebase Extensions** for email) containing a link.  
   - The link points to your **web app** (or a small Cloud Function HTTP endpoint) that:  
     - Validates the token in the link (e.g. a short-lived token you stored in Firestore or in the link itself).  
     - Creates a **custom token** for that user’s UID and redirects to the app (e.g. via a deep link or a page that calls `signInWithCustomToken` and then redirects).  
   - So “sign in” is done by “click link in email” and then the app gets the user signed in via custom token. All of this can be implemented with Firebase (Functions + Firestore + optional extension for sending email).

2. **Load the app from an https URL (simplest for “sign in with email + password”)**  
   - Serve your app at e.g. `https://yourapp.com`.  
   - Add that domain in **Firebase Authentication → Authorized domains**.  
   - In the app (Capacitor), set `server.url` to that https URL.  
   - Then the normal **signInWithEmailAndPassword** in the WebView works, because the origin is allowed. No custom token needed for sign-in.

So in practice:

- **Create account:** Can be done in Firebase with a **Cloud Function + custom token** as in Part 2.
- **Sign in:** Either implement **magic link** (all in Firebase with Functions + email) or use the **https URL** approach so normal email/password sign-in works in the app.

---

## Summary

- **Can you do “use a backend” in Firebase?**  
  **Yes.** Use **Firebase Cloud Functions** as the backend.
- **Create account:** Implement a callable function that creates the user with Admin SDK and returns a **custom token**; app uses **`signInWithCustomToken`**. Fully in Firebase.
- **Sign in:** Admin SDK can’t verify passwords. Use either **magic link** (email link + custom token, all in Firebase) or **serve the app from https** and use normal **signInWithEmailAndPassword** in the app.

If you want, next step can be: add the callable function to your repo (in a `functions/` folder) and wire the app’s “Create account” flow to use it and `signInWithCustomToken`.
