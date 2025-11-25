# Deploying Firebase Security Rules

Follow these steps to deploy your updated security rules to Firebase. This will allow your application to write to Firestore and Storage without requiring authentication.

## Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

## Login to Firebase

```bash
firebase login
```

## Initialize Firebase in your project (if not already done)

```bash
firebase init
```

Select Firestore and Storage when prompted for features.

## Deploy the Security Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

This will deploy both your Firestore and Storage rules to your Firebase project.

## Verify Rules Deployment

1. Go to the Firebase Console: https://console.firebase.google.com/project/lafsys/
2. Navigate to Firestore Database > Rules to check your Firestore rules
3. Navigate to Storage > Rules to check your Storage rules

## Note about Security

The current rules allow any user to write to your database and storage without authentication. This is fine for development and testing, but should **not** be used in production.

Before launching your application, remember to restore the authentication requirements by:

1. Updating the rules files to use the commented production rules
2. Deploying the updated rules
3. Implementing user authentication in your application
