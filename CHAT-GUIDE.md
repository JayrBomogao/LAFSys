# Real-Time Chat System Guide

This guide explains how to use the new real-time chat system between users and administrators.

## Features

The chat system includes:

- Real-time message delivery between users and admins
- Online status indicators showing when users/admins are active
- Typing indicators when someone is composing a message
- Notification sounds for new messages
- Unread message counters in admin inbox
- User identification with name and email

## How to Test

### As a User:

1. Open any item details page (`item-details.html?id=ITEM_ID`) 
2. Click "Chat with Staff" button
3. Set your name and email when prompted
4. Type and send messages

The user will see:
- Online status of admin staff
- Typing indicator when admin is writing
- Notification sound when receiving messages

### As an Admin:

1. Open the admin panel (`admin.html`)
2. Look for message notifications in the inbox tab
3. Click on a message to open the chat interface
4. Send and receive messages

Admins will see:
- Online status of users
- Typing indicators
- Real-time message delivery
- Notification badges for unread messages

## Technical Implementation

The real-time chat system uses Firebase Firestore with these collections:

- `messages`: For inbox messages
- `threads`: For chat threads between users and admin
- `online_status`: To track user/admin online status
- `typing_status`: To track typing indicators

The system leverages Firestore's real-time listeners to update UI components instantly when changes occur.

## User Authentication

While this implementation doesn't require formal login, users can set their name and email to identify themselves in chats. This information is stored in:

1. Session storage for persistence across pages
2. Firestore for real-time status tracking

## File Structure

- `firebase-messages.js`: Core real-time functionality and Firebase integration
- `chat.js`: Admin chat interface logic
- `item-details-chat.js`: User-side chat interface logic
- `sounds/notification.mp3`: Notification sound for new messages
