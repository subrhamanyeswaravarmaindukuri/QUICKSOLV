"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginWithFirebaseEmail, loginWithFirebaseGoogle, checkFirebaseRedirectResult, auth } from "@/services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Mail, Lock, ArrowRight, GraduationCap } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const redirectUrl = searchParams.get("redirect") || "/chat";

  // Check for Google OAuth redirect results or existing active Firebase user
  useEffect(() => {
    checkFirebaseRedirectResult().then((user) => {
      if (user) {
        const userObj = {
          id: user.uid,
          email: user.email || "",
          name: user.displayName || user.email?.split("@")[0] || "QuickSolv User",
          photoURL: user.photoURL
        };
        localStorage.setItem("snaptutor_user", JSON.stringify(userObj));
        router.push(redirectUrl);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userObj = {
          id: user.uid,
          email: user.email || "",
          name: user.displayName || user.email?.split("@")[0] || "QuickSolv User",
          photoURL: user.photoURL
        };
        localStorage.setItem("snaptutor_user", JSON.stringify(userObj));
        router.push(redirectUrl);
      }
    });

    return () => unsubscribe();
  }, [router, redirectUrl]);

  const handleEmailAuth = async (e: React.FormEvent, isSignUp = false) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    
    setIsLoading(true);

    try {
      const fbUser = await loginWithFirebaseEmail(cleanEmail, cleanPassword);
      if (fbUser) {
        const userObj = {
          id: fbUser.uid,
          email: fbUser.email || cleanEmail,
          name: fbUser.displayName || cleanEmail.split("@")[0],
          created_at: new Date().toISOString()
        };
        localStorage.setItem("snaptutor_user", JSON.stringify(userObj));
        setSuccessMsg(isSignUp ? "Account registered in Firebase!" : "Signed in with Firebase!");
        setTimeout(() => router.push(redirectUrl), 400);
      }
    } catch (err: any) {
      console.warn("Firebase Auth error:", err);
      let msg = err.message || "Authentication failed.";
      if (err.code === "auth/invalid-email") msg = "Invalid email format.";
      if (err.code === "auth/weak-password") msg = "Password should be at least 6 characters.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Invalid email or password. Please check your details or register a new account.";
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);
    
    try {
      const fbUser = await loginWithFirebaseGoogle();
      if (fbUser) {
        const userObj = {
          id: fbUser.uid,
          email: fbUser.email || "google.user@gmail.com",
          name: fbUser.displayName || "Google User",
          photoURL: fbUser.photoURL,
          created_at: new Date().toISOString()
        };
        localStorage.setItem("snaptutor_user", JSON.stringify(userObj));
        setSuccessMsg("Logged in with Google!");
        setTimeout(() => router.push(redirectUrl), 400);
      }
    } catch (err: any) {
      console.warn("Firebase Google Auth error:", err);
      let msg = err.message || "Google authentication failed. Please try again.";
      if (err.code === "auth/unauthorized-domain") {
        msg = "Domain not authorized in Firebase. Please add this domain to Firebase Console Authentication -> Authorized Domains.";
      } else if (err.code === "auth/popup-closed-by-user") {
        msg = "Google sign-in popup was closed before completing.";
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow bg-[#FCF9F5] text-gray-900 flex items-center justify-center py-12 px-6">
      <div className="w-full max-w-md">
        
        {/* Logo and Greeting */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="inline-flex items-center space-x-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#4A2711] flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-950 font-serif">
              QuickSolv
            </span>
          </Link>
          <h2 className="text-2xl font-extrabold text-gray-900 font-serif">Create your free QuickSolv account</h2>
          <p className="text-sm text-gray-500 mt-1.5">Start scanning and understanding equations instantly.</p>
        </div>

        {/* Auth Box */}
        <div className="bg-white border border-gray-200/80 p-8 rounded-3xl shadow-lg shadow-[#4A2711]/5">
          
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 font-semibold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-700 font-semibold">
              {successMsg}
            </div>
          )}

          {/* Social Provider */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-3 px-4 border border-gray-200 hover:bg-gray-50 rounded-xl font-semibold text-xs text-gray-700 transition duration-200 flex items-center justify-center gap-2 mb-6 cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
              <span className="bg-white px-3.5 text-gray-400">Or email credentials</span>
            </div>
          </div>

          {/* Email Password Form */}
          <form onSubmit={(e) => handleEmailAuth(e, false)} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-transparent border border-gray-200 focus:border-[#4A2711] focus:ring-2 focus:ring-[#4A2711]/10 rounded-xl text-sm focus:outline-none transition duration-200 text-gray-900"
                  placeholder="name@university.edu"
                />
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-transparent border border-gray-200 focus:border-[#4A2711] focus:ring-2 focus:ring-[#4A2711]/10 rounded-xl text-sm focus:outline-none transition duration-200 text-gray-900"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl text-sm transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-[#4A2711]/10 cursor-pointer disabled:opacity-70"
              >
                {isLoading ? "Signing in..." : "Continue with Email"}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => handleEmailAuth(e, true)}
                disabled={isLoading}
                className="w-full py-2 border border-transparent hover:border-gray-100 text-gray-500 hover:text-[#4A2711] text-xs font-semibold rounded-lg transition duration-200 cursor-pointer"
              >
                No account? Register instead
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-450 mt-8">
          By signing up, you agree to QuickSolv's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow bg-[#FCF9F5] text-gray-900 flex items-center justify-center py-12 px-6">
        <div className="w-8 h-8 rounded-full border-2 border-[#4A2711]/30 border-t-[#4A2711] animate-spin"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
