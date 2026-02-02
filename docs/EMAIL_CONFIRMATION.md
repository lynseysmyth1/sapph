# Disable Email Confirmation (Recommended for Development)

By default, Supabase requires users to confirm their email address before they can sign in. This can be annoying during development.

## Quick Fix: Disable Email Confirmation

1. Go to your **Supabase Dashboard**
2. Click **Authentication** in the left sidebar
3. Click **Providers** (under Authentication)
4. Click **Email**
5. Find **"Confirm email"** or **"Enable email confirmations"**
6. **Turn it OFF** (toggle to the left / gray)
7. Click **Save**

Now when users sign up with email/password, they'll be immediately signed in without needing to confirm their email.

## If You Want to Keep Email Confirmation Enabled

If you keep email confirmation enabled:

1. After signing up, users will receive a confirmation email
2. They need to click the link in the email
3. The link will redirect them back to your app
4. They'll then be automatically signed in

Make sure your **Redirect URLs** in Supabase includes:
- `http://localhost:5173/home` (for development)
- Your production URL (when deployed)

## Troubleshooting

**"Authentication failed" when clicking confirmation link:**
- Check that the redirect URL in Supabase matches where your app is running
- Make sure `http://localhost:5173/home` is in **Authentication → URL Configuration → Redirect URLs**
- Check browser console for errors
