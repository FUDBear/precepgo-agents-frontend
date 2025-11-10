# Firestore Security Rules - Quick Add Guide

## Rules to Add to Your Existing Rules File

Add these rules anywhere inside your `match /databases/{database}/documents {` block:

```javascript
// Agent-generated collections - Allow read access for authenticated users
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

## Where to Add Them

Insert these rules **before** the closing brace `}` of your `match /databases/{database}/documents {` block.

For example, you could add them right before the final closing brace:

```javascript
match /databases/{database}/documents {
  // ... your existing rules ...
  
  // Add the agent rules here (before the closing brace)
  match /agent_evaluations/{document=**} {
    allow read: if request.auth != null;
    allow write: if false;
  }
  
  // ... other agent collections ...
  
} // <-- This closing brace
```

## What These Rules Do

- **`allow read: if request.auth != null`** - Allows authenticated users to read documents
- **`allow write: if false`** - Prevents frontend from writing (only backend can write)

## Testing

After adding and publishing the rules:
1. Open the frontend app
2. Click the **📄 Documents** tab
3. Select a collection (evaluations, scenarios, etc.)
4. You should see documents if they exist

## Troubleshooting

If you get permission errors:
- Ensure you're logged in (rules require authentication)
- Check that rules were published successfully
- Verify collection names match exactly: `agent_evaluations`, `agent_scenarios`, etc.

