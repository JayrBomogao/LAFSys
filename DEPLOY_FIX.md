# Fixing Firebase Deployment Issues

## Issue 1: PowerShell Execution Policy

You're encountering a PowerShell execution policy restriction that prevents running the Firebase CLI scripts. To fix this, you have two options:

### Option 1: Run PowerShell as Administrator and Change the Execution Policy

1. Close VS Code
2. Right-click on PowerShell and select "Run as Administrator"
3. Run this command:
```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
4. Type "Y" to confirm
5. Open VS Code again and try the deployment

### Option 2: Use CMD Instead of PowerShell

1. Open a Command Prompt (CMD) terminal in VS Code
2. Run the Firebase commands there instead of in PowerShell

## Issue 2: Storage Rules Not Found

The error "Could not find rules for the following storage targets: rules" can be fixed by:

1. Make sure you're in the correct project directory
2. Run Firebase init for storage specifically:
```
firebase init storage
```
3. When asked about the rules file, use the default (storage.rules)
4. Try deploying again:
```
firebase deploy --only storage
```

## Manual Update Via Firebase Console

If you continue having issues with the CLI, you can update the rules manually through the Firebase Console:

1. Go to https://console.firebase.google.com/project/lafsys/
2. Navigate to Storage > Rules
3. Copy and paste this content:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow access for development until December 25, 2025
      allow read, write: if request.time < timestamp.date(2025, 12, 25);
    }
  }
}
```

4. Click "Publish"

5. Navigate to Firestore > Rules
6. Copy and paste this content:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 25);
    }
  }
}
```

7. Click "Publish"
