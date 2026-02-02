# Firestore Schema for Chat Functionality

This document describes the Firestore collections and structure needed for the chat functionality.

## Collections

### 1. `likes` Collection

Stores when one user likes another user (heart or friendship).

**Document Structure:**
```javascript
{
  fromUserId: "user123",        // User who gave the like
  toUserId: "user456",          // User who received the like
  likeType: "heart",            // "heart" or "friendship"
  createdAt: Timestamp,         // When the like was given
  matched: false                // Whether both users liked each other
}
```

**Document ID:** `${fromUserId}_${toUserId}` (or auto-generated)

**Indexes needed:**
- `toUserId` + `likeType` (for finding who liked a user)
- `fromUserId` + `likeType` (for finding who a user liked)

---

### 2. `conversations` Collection

Stores conversation metadata between two users.

**Document Structure:**
```javascript
{
  participants: ["user123", "user456"],  // Array of user IDs (sorted)
  lastMessage: "Hey! How's your week going?",  // Last message text
  lastMessageTime: Timestamp,            // When last message was sent
  lastMessageSenderId: "user123",        // Who sent the last message
  likeType: "heart",                     // "heart" or "friendship"
  createdAt: Timestamp,                  // When conversation started
  unreadCount: {                        // Unread count per user
    "user123": 0,
    "user456": 2
  }
}
```

**Document ID:** Auto-generated (or `${participants[0]}_${participants[1]}` sorted)

**Indexes needed:**
- `participants` (array-contains) + `likeType` + `lastMessageTime` (desc)

---

### 3. `messages` Subcollection

Stores individual messages within a conversation.

**Path:** `conversations/{conversationId}/messages`

**Document Structure:**
```javascript
{
  text: "Hey! How's your week going?",   // Message content
  senderId: "user123",                   // Who sent the message
  timestamp: Timestamp,                 // When message was sent
  read: false,                          // Whether message has been read
  readAt: Timestamp                     // When message was read (optional)
}
```

**Document ID:** Auto-generated

**Indexes needed:**
- `timestamp` (asc) - for ordering messages chronologically

---

### 4. `presence` Collection (for online status)

Tracks which users are currently online.

**Document Structure:**
```javascript
{
  userId: "user123",
  isOnline: true,
  lastSeen: Timestamp,
  updatedAt: Timestamp
}
```

**Document ID:** User ID

**Note:** This can be implemented using Firebase Realtime Database presence or Firestore with Cloud Functions.

---

## Security Rules

See `docs/FIRESTORE_SECURITY_RULES.md` for detailed security rules.

---

## Helper Functions

### Creating a Conversation

When two users like each other (mutual like):
1. Check if conversation already exists
2. If not, create new conversation document
3. Set `likeType` based on the like type
4. Initialize `unreadCount` for both users

### Sending a Message

1. Add message to `messages` subcollection
2. Update conversation `lastMessage`, `lastMessageTime`, `lastMessageSenderId`
3. Increment `unreadCount` for recipient
4. Reset `unreadCount` for sender

### Marking Messages as Read

1. Update conversation `unreadCount` for current user
2. Optionally update individual message `read` fields

---

## Example Queries

### Get all conversations for a user (by like type)
```javascript
const q = query(
  collection(db, 'conversations'),
  where('participants', 'array-contains', userId),
  where('likeType', '==', 'heart'),
  orderBy('lastMessageTime', 'desc')
)
```

### Get messages for a conversation
```javascript
const q = query(
  collection(db, 'conversations', conversationId, 'messages'),
  orderBy('timestamp', 'asc')
)
```

### Get who liked a user (by type)
```javascript
const q = query(
  collection(db, 'likes'),
  where('toUserId', '==', userId),
  where('likeType', '==', 'heart')
)
```
