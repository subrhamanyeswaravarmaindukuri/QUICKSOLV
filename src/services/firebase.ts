import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBk6F2blu1z9QL90lPau_PH_QN051BiEZw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "quicksolv-8d65d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "quicksolv-8d65d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "quicksolv-8d65d.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "433217498386",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:433217498386:web:f2f75e867d0d861caf97cb",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ZTSSB6C4PX"
};

// Initialize Firebase App instance safely for SSR & client
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Enforce long-term browserLocalPersistence across days and re-opens
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Firebase persistence initialization notice:", err);
  });
}

// Helper for Real Firebase Email/Password Login with Auto-Registration Fallback
export const loginWithFirebaseEmail = async (email: string, pass: string) => {
  const cleanEmail = email.trim();
  const cleanPassword = pass.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    return userCredential.user;
  } catch (error: any) {
    // If account doesn't exist yet, attempt automatic creation
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password"
    ) {
      try {
        const createCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        return createCredential.user;
      } catch (createErr: any) {
        throw createErr;
      }
    }
    throw error;
  }
};

// Helper for Real Firebase Google OAuth Login
export const loginWithFirebaseGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    // Popup fallback to redirect mode if popups are blocked on mobile browsers
    if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
};

// Helper to sign out
export const logoutFirebase = async () => {
  await firebaseSignOut(auth);
};
