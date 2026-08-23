"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/services/supabase";
import { Sparkles, Mail, Lock, ArrowRight, GraduationCap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const redirectUrl = searchParams.get("redirect") || "/chat";
  const isConfigured = isSupabaseConfigured();

  // If already authenticated, redirect
  useEffect(() => {
    const checkSession = async () => {
      if (isConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push(redirectUrl);
        }
      } else {
        const saved = localStorage.getItem("snaptutor_user");
        if (saved) {
          router.push(redirectUrl);
        }
      }
    };
    checkSession();
  }, [isConfigured, router, redirectUrl]);

  const handleEmailAuth = async (e: React.FormEvent, isSignUp = false) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    
    setIsLoading(true);

    try {
      if (isConfigured && supabase) {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
          });
          if (error) throw error;
          setSuccessMsg("Check your email for the confirmation link!");
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          router.push(redirectUrl);
        }
      } else {
        // SIMULATION MODE
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockUser = {
          id: "mock_user_" + Math.random().toString(36).substring(2, 11),
          email,
          created_at: new Date().toISOString()
        };
        localStorage.setItem("snaptutor_user", JSON.stringify(mockUser));
        setSuccessMsg(isSignUp ? "Account created successfully (Simulated)!" : "Logged in successfully (Simulated)!");
        
        setTimeout(() => {
          router.push(redirectUrl);
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg("");
    setIsLoading(true);
    
    try {
      if (isConfigured && supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` }
        });
        if (error) throw error;
      } else {
        // SIMULATION MODE
        await new Promise(resolve => setTimeout(resolve, 600));
        const mockUser = {
          id: "mock_user_google_" + Math.random().toString(36).substring(2, 11),
          email: "google.student@gmail.com",
          created_at: new Date().toISOString()
        };
        localStorage.setItem("snaptutor_user", JSON.stringify(mockUser));
        setSuccessMsg("Logged in with Google (Simulated)!");
        setTimeout(() => {
          router.push(redirectUrl);
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Google authentication failed.");
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
          
          {/* Simulation Notice Banner */}
          {!isConfigured && (
            <div className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 text-center font-medium">
              ⚠️ Running in <strong>Local Demo Mode</strong>. Credentials will log you in locally.
            </div>
          )}

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
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-3 px-4 border border-gray-200 hover:bg-gray-55 rounded-xl font-semibold text-xs text-gray-700 transition duration-200 flex items-center justify-center gap-2 mb-6"
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
                  className="w-full pl-10 pr-4 py-3 bg-transparent border border-gray-200 focus:border-[#4A2711] focus:ring-2 focus:ring-[#4A2711]/10 rounded-xl text-sm focus:outline-none transition duration-200"
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
                  className="w-full pl-10 pr-4 py-3 bg-transparent border border-gray-200 focus:border-[#4A2711] focus:ring-2 focus:ring-[#4A2711]/10 rounded-xl text-sm focus:outline-none transition duration-200"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl text-sm transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-[#4A2711]/10"
              >
                {isLoading ? "Signing in..." : "Continue with Email"}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => handleEmailAuth(e, true)}
                disabled={isLoading}
                className="w-full py-2 border border-transparent hover:border-gray-100 text-gray-500 hover:text-[#4A2711] text-xs font-semibold rounded-lg transition duration-200"
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
