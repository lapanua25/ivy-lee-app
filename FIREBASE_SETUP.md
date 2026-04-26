# Firebase Integration Setup Guide

## Current Implementation Status

The Ivy Lee Method app has been integrated with Firebase for multi-device sync and cloud data storage (Phase 6 completion).

### What's Been Implemented

1. **Firebase SDK Integration** (index.html)
   - Firebase Auth for Google login
   - Firestore for cloud data storage
   - Service Worker cache updated to v11

2. **Authentication Flow** (app.js)
   - Google authentication button with Firebase Auth
   - User state monitoring with `onAuthStateChanged`
   - Logout functionality
   - Graceful fallback to localStorage when Firebase unavailable

3. **Data Synchronization** (app.js)
   - `loadDataFromFirestore()`: Fetches user data on login
   - `saveStore()`: Auto-saves to both localStorage AND Firestore when logged in
   - First-time user migration: LocalStorage data auto-syncs to Firestore
   - Multi-device sync: Same Google account syncs across all devices

4. **Styling** (styles.css)
   - Authentication UI components
   - Theme-aware styling (light/dark mode)
   - Google login button and user info display

## Firebase Configuration

The app uses this Firebase project:
```
Project ID: ivy-lee-method-2f615
API Key: AIzaSyC-tZ77oTb6Wh4VowihOe00u5qLURiyRIw
Auth Domain: ivy-lee-method-2f615.firebaseapp.com
```

## Setup Instructions

### Step 1: Verify Firebase SDK Loading

The Firebase SDK loads from CDN. For the app to work properly:
- Ensure internet connection is available
- Firebasecdn.com should not be blocked by firewall/proxy
- If developing locally, the Firebase SDKs still load from CDN

### Step 2: Set Firestore Security Rules

**CRITICAL**: Without proper security rules, anyone can read/write any user's data.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select the "ivy-lee-method-2f615" project
3. Navigate to Firestore Database → Rules
4. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

5. Click "Publish"

**This rule ensures**: 
- Only authenticated users can access their own data
- Users cannot access other users' data
- Unauthorized users cannot read or write

### Step 3: Enable Google Sign-In

1. In Firebase Console → Authentication → Sign-in providers
2. Ensure "Google" is enabled
3. Add your domain(s) to the authorized JavaScript origins:
   - `http://localhost:8080` (for local development)
   - `https://terra-nova-botanical.com` (if deploying there)
   - Any other domain where the app is hosted

### Step 4: Test the Setup

1. **Local Testing**:
   ```bash
   python -m http.server 8080
   # or
   npx http-server -p 8080
   ```
   Then open `http://localhost:8080`

2. **Testing Flow**:
   - Click "Google でログイン" button
   - Sign in with your Google account
   - Your email should appear in the header
   - Create/modify tasks
   - Refresh the page - tasks should persist
   - Open in another browser/device with same Google account - data should sync
   - Click "ログアウト" - should return to local storage mode

## How It Works

### When Firebase is Available (Logged In)

1. User clicks "Google でログイン"
2. Firebase Auth popup opens
3. User authenticates with Google
4. `onAuthStateChanged` fires with user object
5. `loadDataFromFirestore()` loads user's data from cloud
6. All changes save to BOTH localStorage and Firestore
7. User info displayed in header with logout button

### When Firebase is Unavailable (Local Mode)

1. App detects Firebase SDK not loaded
2. Falls back to localStorage-only mode
3. Console shows: "Firebase SDK not loaded. Multi-device sync disabled - using local storage only."
4. All features work normally using localStorage
5. No multi-device sync, data persists locally only

### Multi-Device Sync

When logged in with the same Google account on multiple devices:
1. Each device saves changes to Firestore
2. Changes sync across devices within seconds
3. Last-write-wins conflict resolution
4. Local cache ensures app works while offline
5. Data syncs when connection restored

## Data Structure

```json
{
  "users": {
    "{userId}": {
      "data": {
        "work": {
          "tasksByDate": {
            "YYYY-MM-DD": [
              { "id": "...", "text": "...", "completed": false, "isRoutine": false }
            ]
          },
          "history": [
            { "text": "...", "completedAt": "ISO-8601" }
          ],
          "routines": [
            { "id": "...", "text": "...", "type": "daily|weekly|monthly|nth-weekday", "value": ... }
          ]
        },
        "private": { ... }
      },
      "lastUpdated": "ISO-8601 timestamp"
    }
  }
}
```

## Troubleshooting

### "Firebase SDK failed to load"

**Cause**: Firebase CDN not accessible
**Solutions**:
- Check internet connection
- Check firewall/proxy isn't blocking gstatic.com or googleapis.com
- For offline use, app continues working with localStorage

### Login button doesn't respond

**Possible causes**:
1. JavaScript error in auth code
2. Firebase SDK not loaded
3. Browser security settings blocking popups

**Fix**:
- Check browser console (F12) for errors
- Allow popups for localhost
- Check network tab to ensure Firebase scripts loaded

### Data not syncing across devices

**Possible causes**:
1. Firestore security rules not set correctly
2. Not logged in
3. Internet connection issues

**Fix**:
- Verify security rules are published
- Check browser console for Firebase errors
- Ensure both devices logged in with same Google account
- Check network connection

### Blank main area (no week cards showing)

**Possible causes**:
1. JavaScript error in renderWeek function
2. localStorage data corrupted
3. Theme selector causing issues

**Debug steps**:
1. Open browser console (F12)
2. Clear localStorage: `localStorage.clear()`
3. Reload page
4. Check console for errors
5. Check if store data initialized: `console.log(store)`

## Future Improvements

1. Add offline mode with background sync
2. Implement data backup/restore from Firebase
3. Add user settings storage
4. Implement real-time collaboration for shared tasks
5. Add data encryption in Firestore
6. Implement daily task push notifications via Firebase Cloud Messaging

## Notes for Developers

- Always test locally first with `python -m http.server`
- Remember to update Service Worker cache version (CACHE_NAME in sw.js) after changes
- Firebase configuration is stored in index.html as part of the HTML (not ideal for production - consider using environment variables)
- The app gracefully degrades without Firebase - localStorage-only mode is a valid fallback
- For security, never commit real API keys to git - use environment variables in production

## Contact & Support

If you encounter issues:
1. Check browser console for specific error messages
2. Verify Firestore rules are correctly published
3. Ensure Firebase project settings are correct
4. Test with a fresh browser window (clear cache if needed)
