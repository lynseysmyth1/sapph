# Firestore Security Rules for Chat

Add these rules to your Firestore security rules in Firebase Console.

## Complete Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Profiles - users can read all profiles (for discovery), write only their own
    match /profiles/{userId} {
      allow read: if request.auth != null; // Allow reading any profile for discovery
      allow write: if request.auth != null && request.auth.uid == userId; // Only write own profile
    }
    
    // Likes - users can create likes, read likes they're involved in
    match /likes/{likeId} {
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.fromUserId;
      allow read: if request.auth != null 
        && (request.auth.uid == resource.data.fromUserId 
            || request.auth.uid == resource.data.toUserId);
      allow update: if request.auth != null 
        && request.auth.uid == resource.data.fromUserId;
    }
    
    // Conversations - users can only access conversations they're part of
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null 
        && request.auth.uid in resource.data.participants;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow create: if request.auth != null 
          && request.auth.uid == request.resource.data.senderId
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow read: if request.auth != null 
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow update: if request.auth != null 
          && request.auth.uid == resource.data.senderId;
      }
    }
    
    // Presence - users can update their own presence, read anyone's
    match /presence/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## How to Apply

### Option 1: Copy from firestore.rules file (Recommended)
1. Open `firestore.rules` file in the project root
2. Copy all the contents
3. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
4. Paste the rules
5. Click **Publish**

### Option 2: Copy from this document
1. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
2. Replace the existing rules with the rules above
3. Click **Publish**

### Option 3: Deploy via Firebase CLI (Advanced)
If you have Firebase CLI set up:
```bash
firebase deploy --only firestore:rules
```

## Required Indexes

Firestore will prompt you to create indexes when you first run queries. You can also create them manually:

1. Go to **Firestore Database** → **Indexes** tab
2. Click **Create Index**
3. Create these indexes:

**Index 1: Conversations by participants and likeType**
- Collection: `conversations`
- Fields:
  - `participants` (Array)
  - `likeType` (Ascending)
  - `lastMessageTime` (Descending)
- Query scope: Collection

**Index 2: Likes by toUserId and likeType**
- Collection: `likes`
- Fields:
  - `toUserId` (Ascending)
  - `likeType` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection

**Index 3: Messages by timestamp**
- Collection: `conversations/{conversationId}/messages`
- Fields:
  - `timestamp` (Ascending)
- Query scope: Collection

**Index 4: Profiles by onboarding_completed (REQUIRED for discovery)**
- Collection: `profiles`
- Fields:
  - `onboarding_completed` (Ascending)
- Query scope: Collection
- **Status:** ⚠️ **CRITICAL** - Without this index, discovery profiles will fail to load!

**Note:** Firebase will automatically prompt you to create this index when you first run the discovery query. Click the link in the error message to create it instantly.
