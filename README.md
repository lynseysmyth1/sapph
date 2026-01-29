# Sapph – Dating App for Women

React app (Vite) with Supabase auth and Capacitor for native iOS/Android. Flow: **Landing → Enter → Sign in (Apple, Google, Facebook, Email) → Home**.

---

## What’s included

- **React** (Vite) + **React Router**
- **Supabase** – auth (Apple, Google, Facebook, Email / magic link)
- **Capacitor** – ready for native (camera, push, geolocation, preferences installed)
- **Pages:** Landing, Sign In, Home (protected)

---

## Supabase – what you need

1. **Project URL** and **anon (public) key**  
   In Supabase: **Project Settings → API** → copy **Project URL** and **anon public**.

2. **Auth providers** (enable in **Authentication → Providers**):
   - **Email** – on by default (magic link + password)
   - **Google** – turn on, add OAuth client ID/secret from Google Cloud Console
   - **Apple** – turn on, add Apple credentials (needed for App Store)
   - **Facebook** – turn on, add App ID/secret from Facebook Developer

3. **Redirect URL**  
   In **Authentication → URL Configuration**, add:
   - `http://localhost:5173/home` (dev)
   - Your production URL later, e.g. `https://yourapp.com/home`

---

## Run the app

1. **Copy env and add your Supabase keys**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `VITE_SUPABASE_URL` = your Supabase project URL  
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key  

2. **Install and run**
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173).  
   Flow: **Enter** → **Sign in** (use one of the providers or email) → **Home**.

---

## GitHub

- **You don’t need to give me anything for GitHub.**  
  When you’re ready:
  1. Create a new repo on GitHub (e.g. `sapph-app`).
  2. In this folder:
     ```bash
     git init
     git add .
     git commit -m "Initial Sapph app"
     git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
     git push -u origin main
     ```
- **Do not commit `.env`** – it’s in `.gitignore`.  
  For CI or teammates, use repo secrets or a shared `.env.example` with placeholder values.

---

## Native (iOS / Android)

Capacitor and plugins are installed. To add the native projects (run once):

```bash
npm run build
npx cap add ios
npx cap add android
```

Then:

- **iOS:** `npx cap open ios` (needs Xcode on Mac)
- **Android:** `npx cap open android` (needs Android Studio)

After code changes:

```bash
npm run build
npx cap sync
```

---

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run preview` | Preview production build |
| `npx cap sync` | Copy build into native projects |

---

## Auth flow summary

- **Landing** – “Enter” goes to Sign in (or Home if already logged in).
- **Sign in** – Apple, Google, Facebook (OAuth), or Email (magic link or password).
- **Home** – Protected; shows welcome and Sign out.  
All auth state is via Supabase; session is restored on refresh.
