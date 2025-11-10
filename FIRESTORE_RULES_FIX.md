# Firestore Security Rules - Quick Fix

## Error
You're getting "Missing or insufficient permissions" errors because the Firestore security rules don't allow read access to the `agent_` collections yet.

## Quick Fix

Add these rules to your Firestore security rules in the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `auth-demo-90be0`
3. Navigate to **Firestore Database** → **Rules**
4. Add these rules **inside** your existing `match /databases/{database}/documents {` block:

```javascript
// Agent-generated collections - Allow read access
match /agent_evaluations/{document=**} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /agent_scenarios/{document=**} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /agent_notifications/{document=**} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /agent_coa_reports/{document=**} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /agent_states/{document=**} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

5. Click **Publish**

## Important Notes

- **`allow read: if request.auth != null`** - Requires user to be authenticated
- **`allow write: if false`** - Prevents frontend from writing (only backend can write)
- Add these rules **before** the closing brace `}` of your `match /databases/{database}/documents {` block
- Don't replace your existing rules - just add these new ones

## If You Don't Have Authentication

If your frontend doesn't have Firebase Authentication set up, you can temporarily allow unauthenticated reads (less secure):

```javascript
// Less secure - allows unauthenticated reads
match /agent_evaluations/{document=**} {
  allow read: if true;
  allow write: if false;
}
```

**⚠️ Warning**: Only use `allow read: if true` for testing. For production, use authentication.

## After Adding Rules

1. Wait a few seconds for rules to propagate
2. Refresh your frontend app
3. The documents should now load without permission errors

