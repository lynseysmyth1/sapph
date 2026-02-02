# Firestore Security Rules for Chat

Add these rules to your Firestore security rules in Firebase Console.

## Complete Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Profiles - users can only read/write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
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

1. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
2. Replace the existing rules with the rules above
3. Click **Publish**

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
