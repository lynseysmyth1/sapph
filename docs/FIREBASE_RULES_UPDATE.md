# Firebase Rules Update - Quick Guide

## What Changed

The Firestore security rules have been updated to allow **profile discovery** (reading other users' profiles).

## Why This Change Was Needed

The discovery feature needs to query all profiles where `onboarding_completed == true`, but the old rules only allowed users to read their own profile. This caused permission-denied errors and empty profile lists.

## Updated Rules

**Before (blocked discovery):**
```javascript
allow read, write: if request.auth != null && request.auth.uid == userId;
```

**After (allows discovery):**
```javascript
allow read: if request.auth != null; // Allow reading any profile
allow write: if request.auth != null && request.auth.uid == userId; // Only write own profile
```

## Security

This change is **safe** because:
- ✅ Users can only **read** profiles (not modify)
- ✅ Users can only **write** their own profile
- ✅ Profile data is meant to be discoverable (standard dating app pattern)
- ✅ All reads still require authentication (`request.auth != null`)

## How to Apply

### Step 1: Update Firestore Rules

1. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
2. Copy the rules from `firestore.rules` file (in project root)
3. Paste into the Rules editor
4. Click **Publish**

### Step 2: Create Required Index

1. Go to **Firestore Database** → **Indexes** tab
2. Click **Create Index**
3. Set:
   - **Collection ID:** `profiles`
   - **Fields to index:**
     - `onboarding_completed` - Ascending
   - **Query scope:** Collection
4. Click **Create**

**Note:** Firebase may automatically prompt you to create this index when you first run the discovery query. Click the link in the error message to create it instantly.

## Verify It Works

After updating rules and creating the index:

1. Complete onboarding with a test account
2. Sign in with another account
3. Go to Home/Discovery tab
4. Profiles should load (if other users exist)

## Troubleshooting

**Still seeing "No more profiles"?**
- Check browser console for error messages
- Verify rules were published (check Rules tab)
- Verify index was created (check Indexes tab)
- Check that other users have completed onboarding

**Permission denied errors?**
- Make sure rules were published
- Check that you're signed in
- Verify the rules match `firestore.rules` file exactly

**Missing index errors?**
- Create the index manually (see Step 2 above)
- Or click the link in the error message to create it automatically
