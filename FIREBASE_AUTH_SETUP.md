# Firebase Anonymous Authentication Setup

## Problem
If you're getting `400 Bad Request` errors from Firestore, it's because the Firestore security rules require authentication (`request.auth != null`), but the frontend wasn't authenticated.

## Solution: Anonymous Authentication

The frontend now uses **anonymous authentication** to automatically sign users in without requiring login credentials. This is perfect for public dashboards where you want authenticated access but don't need user accounts.

## Enable Anonymous Auth in Firebase Console

You need to enable anonymous authentication in your Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `auth-demo-90be0`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Anonymous** in the providers list
5. Click **Enable**
6. Click **Save**

## How It Works

The frontend automatically signs in anonymously when the app loads:

```typescript
// src/config/firebase.ts
signInAnonymously(auth)
  .then(() => {
    console.log('[Firebase] ✅ Signed in anonymously');
  })
  .catch((error) => {
    console.error('[Firebase] ❌ Error signing in anonymously:', error);
  });
```

## Benefits

- ✅ No user login required
- ✅ Users are automatically authenticated
- ✅ Works with Firestore security rules that require `request.auth != null`
- ✅ Each user gets a unique anonymous UID
- ✅ Better security than allowing unauthenticated access

## Security Rules

Your existing Firestore security rules will work:

```javascript
match /agent_evaluations/{document=**} {
  allow read: if request.auth != null;  // ✅ Works with anonymous auth
  allow write: if false;
}
```

## Testing

After enabling anonymous auth:

1. Refresh your frontend app
2. Check the browser console - you should see:
   ```
   [Firebase] ✅ Signed in anonymously
   [Firebase] 🔐 User authenticated: <anonymous-uid>
   ```
3. Firestore queries should now work without 400 errors

## Troubleshooting

### "Anonymous sign-in is disabled"
- Go to Firebase Console → Authentication → Sign-in method
- Enable "Anonymous" provider

### Still getting 400 errors
- Wait a few seconds for authentication to complete
- Check browser console for auth errors
- Verify Firestore security rules are published

### Want to disable anonymous auth?
- You can change security rules to `allow read: if true` (less secure)
- Or implement a different authentication method

