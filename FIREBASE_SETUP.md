# Firebase Setup for LAFSys

This guide will help you complete the setup to connect your Firebase project with this application.

## Steps to Complete Firebase Setup

### 1. Firebase Configuration

The `firebase.js` file in the `js` directory already contains your Firebase configuration. Make sure the following Firebase services are enabled in your Firebase project:

- Authentication
- Firestore Database
- Storage

### 2. Deploy Security Rules

Upload the security rules files to your Firebase project:

- `firestore.rules` - These rules determine who can read and write to your Firestore database
- `storage.rules` - These rules determine who can read and upload files to Firebase Storage

You can deploy these rules using the Firebase CLI or from the Firebase Console.

### 3. Create Firestore Collections

In the Firebase Console, set up the following collections:

- `items` - To store all lost and found items
- `claims` - To store claims made on items
- `messages` - To store messages/inquiries

### 4. Implementing Authentication (Optional)

If you want to restrict the admin functions, you'll need to set up Firebase Authentication:

1. In the Firebase Console, go to Authentication
2. Enable Email/Password authentication
3. Create an admin user for yourself
4. Update the admin pages to require authentication

### 5. Testing the Integration

1. Open the application in a web browser
2. Try adding a new item from the "Add New Item" page
3. Check your Firestore database to confirm the item was added
4. View the items on the main page to verify they're loading from Firestore

## Files Updated for Firebase

- `js/firebase.js` - Main Firebase configuration
- `js/firestore-data.js` - Firestore data handling functions
- `index.html` - Updated to initialize Firebase
- `add-item.html` - Updated to save items to Firestore

## Next Steps for Complete Migration

1. Update `main.js` to use Firestore data instead of the local data store
2. Update `admin.html` to authenticate admins and manage items in Firestore
3. Update `claims.html` to manage claims in Firestore
4. Update `chat.html` to store messages in Firestore
5. Set up proper error handling and loading states

## Helpful Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
