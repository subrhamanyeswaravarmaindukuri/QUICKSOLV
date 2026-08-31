import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

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
export const db = getFirestore(app);
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

// Store user details in Firebase Firestore database
export const saveFirebaseUserData = async (user: FirebaseUser) => {
  if (!user || !user.uid) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    const userData = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || user.email?.split("@")[0] || "QuickSolv Student",
      photoURL: user.photoURL || "",
      provider: user.providerData[0]?.providerId || "firebase",
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        tier: "FREE",
        credits: 150
      }, { merge: true });
    } else {
      await setDoc(userRef, userData, { merge: true });
    }
  } catch (err) {
    console.warn("Firebase Firestore user sync notice:", err);
  }
};

// Helper to check for OAuth redirect login results
export const checkFirebaseRedirectResult = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await saveFirebaseUserData(result.user);
      return result.user;
    }
  } catch (err) {
    console.warn("Firebase redirect check notice:", err);
  }
  return null;
};

// Helper for Real Firebase Email/Password Login with Auto-Registration Fallback
export const loginWithFirebaseEmail = async (email: string, pass: string) => {
  const cleanEmail = email.trim();
  const cleanPassword = pass.trim();

  let user: FirebaseUser | null = null;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    user = userCredential.user;
  } catch (error: any) {
    // If account doesn't exist yet, attempt automatic creation
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password"
    ) {
      try {
        const createCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        user = createCredential.user;
      } catch (createErr: any) {
        throw createErr;
      }
    } else {
      throw error;
    }
  }

  if (user) {
    await saveFirebaseUserData(user);
  }
  return user;
};

// Helper for Real Firebase Google OAuth Login with popup & redirect fallback
export const loginWithFirebaseGoogle = async () => {
  let user: FirebaseUser | null = null;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    user = result.user;
  } catch (error: any) {
    console.warn("Popup authentication prevented, switching to OAuth redirect mode:", error?.code || error);
    // Popup fallback to redirect mode if popups are blocked on browsers
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  if (user) {
    await saveFirebaseUserData(user);
  }
  return user;
};

// Helper to sign out
export const logoutFirebase = async () => {
  await firebaseSignOut(auth);
};
