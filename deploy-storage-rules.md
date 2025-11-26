# Deploying Firebase Storage Rules

To deploy these updated storage rules, follow these steps:

1. Make sure you have the Firebase CLI installed:
   ```
   npm install -g firebase-tools
   ```

2. Log in to Firebase:
   ```
   firebase login
   ```

3. Initialize your project (if not already done):
   ```
   firebase init
   ```
   - Select "Storage" when prompted for services
   - Choose your existing project

4. Deploy the updated storage rules:
   ```
   firebase deploy --only storage
   ```

These updated rules will allow:
- Public read access to all files (anyone can view the images)
- Write access to upload new images in the items/ and drafts/ folders
- For development purposes, write access is granted broadly

For a production environment, you might want to restrict write access to authenticated users only.
