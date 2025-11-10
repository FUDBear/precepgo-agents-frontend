// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAW2WTCJVFkQMkUpYftA7tO3YOnTZaBuZ4",
  authDomain: "auth-demo-90be0.firebaseapp.com",
  projectId: "auth-demo-90be0",
  storageBucket: "auth-demo-90be0.appspot.com",
  messagingSenderId: "724879935154",
  appId: "1:724879935154:web:cfc84dee1c2a64b7ac2bab",
  measurementId: "G-03GXD4RYNC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Sign in anonymously on app load (allows Firestore access)
if (typeof window !== 'undefined') {
  signInAnonymously(auth)
    .then(() => {
      console.log('[Firebase] ✅ Signed in anonymously');
    })
    .catch((error) => {
      console.error('[Firebase] ❌ Error signing in anonymously:', error);
    });
}

// Initialize Firestore
export const db = getFirestore(app);

// Debug: Log Firebase initialization
if (typeof window !== 'undefined') {
  console.log('[Firebase] Initialized with project:', firebaseConfig.projectId);
  console.log('[Firebase] Firestore instance:', db);
  
  // Monitor auth state changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('[Firebase] 🔐 User authenticated:', user.uid);
    } else {
      console.log('[Firebase] ⚠️ User not authenticated');
    }
  });
}

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;

