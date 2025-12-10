/**
 * Firebase Chat Configuration
 * This file initializes Firebase services for the real-time chat system
 */

// Initialize Firebase if not already initialized
if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not found. Make sure it is loaded before this script.');
} else {
  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBGH1-fruNM0GPOLpOjfOIxHpLgqzt8fe0",
    authDomain: "lafsys.firebaseapp.com",
    projectId: "lafsys",
    storageBucket: "lafsys.appspot.com",
    messagingSenderId: "103945210522",
    appId: "1:103945210522:web:f5a51c84653a0cab10ed23",
    measurementId: "G-EJ2X0PTDNH"
  };

  // Initialize Firebase app if not already initialized
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Initialize Firestore
  const db = firebase.firestore();

  // Initialize Firebase Auth
  const auth = firebase.auth();

  // Enable offline persistence for Firestore
  db.enablePersistence({ synchronizeTabs: true })
    .catch(err => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('Firebase persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required for persistence
        console.warn('Firebase persistence not available in this browser');
      }
    });

  // Make Firebase services available globally
  window.firebaseChat = {
    db,
    auth,
    FieldValue: firebase.firestore.FieldValue,
    serverTimestamp: firebase.firestore.FieldValue.serverTimestamp,
    getCurrentUser: () => auth.currentUser,
    isAdmin: (user) => {
      if (!user) return false;
      // Add admin emails here or check a custom claim
      const adminEmails = ['admin@lafsys.gov'];
      return adminEmails.includes(user.email);
    },
    // Helper function to generate a chat ID between two users
    generateChatId: (userId1, userId2) => {
      // Sort the IDs to ensure consistency
      const sortedIds = [userId1, userId2].sort();
      return `${sortedIds[0]}_${sortedIds[1]}`;
    },
    // Helper function to create a timestamp
    timestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
    // Authentication helpers
    signIn: async (email, password) => {
      return auth.signInWithEmailAndPassword(email, password);
    },
    signOut: async () => {
      return auth.signOut();
    }
  };
  
  console.log('Firebase Chat initialized successfully');
}
