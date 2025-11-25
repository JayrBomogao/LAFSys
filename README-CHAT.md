# Firebase Chat and Inbox System

This document explains how the chat and inbox system works in the Lost and Found application.

## Overview

The chat and inbox system allows users to communicate with staff about lost and found items. It consists of:

1. **User-facing chat** on the item details page
2. **Admin inbox** in the admin dashboard
3. **Admin chat** for responding to user messages
4. **Firebase database** for storing and retrieving messages

## Key Files

- `firebase-messages.js`: Core functionality for Firebase-backed messaging
- `inbox.html`: Admin inbox interface
- `chat.html`: Chat interface for both users and admins
- `item-details.html`: Item details page with chat functionality

## How It Works

### User Chat (Item Details Page)

When a user views an item and wants to inquire about it:

1. They click "Chat with Staff" on the item details page
2. A chat modal opens where they can type messages
3. Messages are sent to Firebase Firestore
4. The system creates a conversation thread associated with their session
5. Admin staff can see these messages in their inbox

### Admin Inbox

The admin inbox shows all incoming messages from users:

1. Messages are fetched from Firestore in real-time
2. Unread messages are highlighted
3. Admins can click on a message to open the chat interface
4. Admins can delete messages if needed

### Admin Chat

When an admin opens a chat thread:

1. The complete conversation history is shown
2. Admin responses are marked as coming from "Admin"
3. All messages are synchronized in real-time with Firebase
4. Multiple admins can participate in the same conversation

## Firebase Structure

The Firebase Firestore database uses two main collections:

### 1. `messages` Collection

Contains inbox messages with fields:
- `id`: Unique message identifier
- `from`: Sender name
- `email`: Sender email (used to link messages to threads)
- `subject`: Message subject
- `body`: Message content
- `date`: Timestamp
- `unread`: Boolean flag for new messages

### 2. `threads` Collection

Contains conversation threads with fields:
- Document ID: The user's email address
- `messages`: Array of messages in the thread
  - `id`: Message ID
  - `sender`: Email of sender
  - `name`: Display name of sender
  - `body`: Message content
  - `date`: Timestamp

## Key Functions

### MessagesStore API

The `MessagesStore` object provides these main functions:

- `getAllAsync()`: Fetches all inbox messages
- `getThreadAsync(email)`: Fetches a specific chat thread
- `sendAsync(email, name, body, from)`: Sends a message
- `markAsReadAsync(id)`: Marks a message as read
- `removeAsync(id)`: Deletes a message

## Real-time Updates

The system uses Firebase's real-time listeners to update the UI when:

1. New messages arrive
2. Messages are read or deleted
3. Someone responds in an active chat thread

## Development Notes

- The system is backward compatible with the original localStorage-based system
- All Firebase operations are properly error-handled with fallbacks
- The UI updates in real-time without page refreshes
- Message threads persist across sessions for the same user
