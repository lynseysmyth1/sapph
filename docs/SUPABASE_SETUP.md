# Supabase setup for Sapph – start here

Do these **three** things in order. Everything happens in the **Supabase website** (except pasting the key into your project’s `.env` file).

---

## Where things are in Supabase

When you’re in your project, the **left sidebar** has:

- **Home** (house icon)
- **Table Editor**
- **SQL Editor**
- **Authentication** ← we use this
- **Storage**
- **Database**
- … more …
- **Project Settings** (gear icon) ← at the **bottom** of the sidebar

So: **Authentication** is in the main list. **Project Settings** is separate, at the bottom.

---

# Step 1 – Get your Project URL and anon key

You need these so your app can talk to Supabase. The URL is already in your `.env`; you only need to **copy the anon key** and paste it into `.env`.

1. Go to **https://supabase.com/dashboard** and log in.
2. Click your **project** (the one for Sapph). You’ll see the project’s dashboard.
3. On the **left sidebar**, scroll to the **bottom** and click **Project Settings** (gear icon).
4. In the **left menu of Project Settings**, click **API**.
5. On the API page you’ll see two sections:
   - **Project URL** – a URL like `https://kwtxpvgcadvyoejzhukz.supabase.co`
   - **Project API keys** – a list of keys
6. Under **Project API keys**, find the row that says **anon** and **public** (do **not** use the one that says **service_role**).
7. On that **anon** row, click **Reveal** (or the copy icon) to show the key, then **Copy** the whole key (it starts with `eyJ...` and is long).
8. On your computer, open your **Sapph** project in Cursor. In the **left file list**, open the file named **`.env`** (same folder as `package.json`).  
   - If you don’t see `.env`, press **Cmd+P** (Mac) or **Ctrl+P** (Windows), type `env`, and open **.env**.
9. In `.env` you’ll see a line like:
   ```text
   VITE_SUPABASE_ANON_KEY=
   ```
   **Paste** the key you copied **right after the `=`** (no space, no quotes). Save the file.

Done with Step 1.

---

# Step 2 – Add the redirect URL (so sign-in can return to your app)

1. Stay in the **Supabase** tab. In the **left sidebar** (the main one, not inside Project Settings), click **Authentication**.
2. Under **Authentication**, you’ll see a **second** menu. Click **URL Configuration**.
3. Find the box called **Redirect URLs**.
4. In the text field, type exactly:
   ```text
   http://localhost:5173/home
   ```
5. Click **Add URL** (or **Save**), so that this URL is in the list.
6. If there’s a **Save** button at the bottom of the page, click it.

Done with Step 2.

---

# Step 3 – Turn on Email sign-in

1. Still under **Authentication**. In the **second** menu under Authentication, click **Providers** (not “URL Configuration”).
2. You’ll see a list of providers (Email, Google, Apple, Facebook, etc.). Click **Email**.
3. Make sure **Enable Email provider** is **ON** (toggle to the right / blue).
4. Click **Save** at the bottom of the form.

Done. Email sign-in (magic link and password) will now work.

---

# Test it

1. In your project folder, in a terminal, run:
   ```bash
   npm run dev
   ```
2. Open **http://localhost:5173** in your browser.
3. Click **Enter**, then **Sign in**.
4. Use **Continue with Email** – enter your email and either:
   - leave password blank and click **Sign in** (you’ll get a magic link in your email), or  
   - enter a password and click **Sign in**.

If you get redirected to a “Welcome” screen after sign-in, Supabase is set up correctly.

---

# Optional – Google, Apple, Facebook (do later)

You only need these if you want “Continue with Google / Apple / Facebook”. You can add them anytime.

- **Google** – Supabase: **Authentication** → **Providers** → **Google**. Turn it on and paste a **Client ID** and **Client Secret** from Google Cloud Console (we have a separate section for that if you want it).
- **Apple** – Needed for the iOS app; set up when you’re ready for App Store.
- **Facebook** – Supabase: **Authentication** → **Providers** → **Facebook**. Turn it on and paste **App ID** and **App Secret** from Facebook Developers.

If you want the exact clicks for Google or Facebook, say which one and we can do a “start here” guide for that next.
