# Setting Up Firestore for Chat - Step by Step

Follow these steps to set up Firestore for the chat functionality.

## Step 1: Update Firestore Security Rules

1. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
2. Copy the rules from `firestore.rules` file (in project root) or `docs/FIRESTORE_SECURITY_RULES.md`
3. Paste into the Rules editor
4. Click **Publish**

**Important:** The rules allow reading all profiles for discovery. Users can only write their own profile.

## Step 2: Create Required Indexes

Firestore will prompt you to create indexes when you first run queries, but you can create them manually:

### Index 1: Conversations Query
1. Go to **Firestore Database** → **Indexes** tab
2. Click **Create Index**
3. Set:
   - **Collection ID:** `conversations`
   - **Fields to index:**
     - `participants` - Array
     - `likeType` - Ascending
     - `lastMessageTime` - Descending
   - **Query scope:** Collection
4. Click **Create**

### Index 2: Likes Query (if needed)
1. Click **Create Index**
2. Set:
   - **Collection ID:** `likes`
   - **Fields to index:**
     - `toUserId` - Ascending
     - `likeType` - Ascending
     - `createdAt` - Descending
   - **Query scope:** Collection
3. Click **Create**

### Index 3: Messages Query
1. Click **Create Index**
2. Set:
   - **Collection ID:** `conversations/{conversationId}/messages`
   - **Fields to index:**
     - `timestamp` - Ascending
   - **Query scope:** Collection
3. Click **Create**

**Note:** Index creation can take a few minutes. You'll see a notification when they're ready.

## Step 3: Test the Chat

1. **Create test data** (optional):
   - You can manually create conversations in Firestore to test
   - Or wait until users start liking each other (which will auto-create conversations)

2. **Test sending messages:**
   - Go to `/messages`
   - Click on a conversation
   - Send a message
   - It should appear in real-time!

## How It Works

### When a User Likes Someone:

1. User A likes User B (heart or friendship)
2. System records the like in `likes` collection
3. System checks if User B also liked User A
4. If it's a match:
   - Creates a conversation in `conversations` collection
   - Conversation appears in both users' message lists

### When Sending a Message:

1. Message is added to `conversations/{conversationId}/messages`
2. Conversation metadata is updated:
   - `lastMessage` - the message text
   - `lastMessageTime` - timestamp
   - `lastMessageSenderId` - who sent it
   - `unreadCount` - incremented for recipient, reset for sender

### Online Status:

- When user signs in → `presence/{userId}` is set to `isOnline: true`
- When user signs out → `presence/{userId}` is set to `isOnline: false`
- Other users can query presence to see if someone is online

## Troubleshooting

**"Missing or insufficient permissions"**
- Check that security rules are published
- Make sure user is authenticated
- Verify user is a participant in the conversation

**"The query requires an index"**
- Click the error link in the console to create the index automatically
- Or create it manually in Firestore → Indexes

**Messages not appearing**
- Check browser console for errors
- Verify Firestore indexes are created and ready
- Make sure security rules allow read access

**Online status not updating**
- Check that `presence` collection exists
- Verify security rules allow write access for the user's own presence document
