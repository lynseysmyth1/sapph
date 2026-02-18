// Use v1 so this deploys as 1st gen → predictable URL (us-central1-PROJECT.cloudfunctions.net/name)
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Callable: create account with email/password and return a custom token.
 * App uses signInWithCustomToken(auth, customToken) so the user is signed in
 * without needing the WebView origin to be in Firebase Authorized domains.
 *
 * Request body: { email: string, password: string }
 * Response: { customToken: string }
 */
exports.createAccountWithToken = functions.https.onCall(async (data, context) => {
  const { email, password } = data || {};

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Email and password are required.");
  }

  const emailTrimmed = email.trim().toLowerCase();
  if (!emailTrimmed) {
    throw new functions.https.HttpsError("invalid-argument", "Email is required.");
  }
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
  } catch (err) {
    const code = err.code || "";
    const message = err.message || "Failed to create account.";
    if (code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "An account with this email already exists.");
    }
    if (code === "auth/invalid-email") {
      throw new functions.https.HttpsError("invalid-argument", "Invalid email address.");
    }
    if (code === "auth/weak-password") {
      throw new functions.https.HttpsError("invalid-argument", "Password is too weak.");
    }
    throw new functions.https.HttpsError("internal", message);
  }
});
