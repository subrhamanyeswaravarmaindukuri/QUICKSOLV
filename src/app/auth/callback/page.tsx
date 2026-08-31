"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/services/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const next = searchParams.get("next") || "/chat";
      const code = searchParams.get("code");

      if (code && isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            localStorage.setItem("snaptutor_user", JSON.stringify(data.session.user));
            router.push(next);
            return;
          }
        } catch (err) {
          console.error("Supabase OAuth code exchange error:", err);
        }
      }

      // Check if session exists in Supabase
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            localStorage.setItem("snaptutor_user", JSON.stringify(data.session.user));
            router.push(next);
            return;
          }
        } catch (err) {
          console.error("Session check error:", err);
        }
      }

      router.push(next);
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="flex-grow bg-[#FCF9F5] text-gray-900 flex flex-col items-center justify-center py-20 px-6">
      <div className="w-10 h-10 rounded-full border-3 border-[#4A2711]/30 border-t-[#4A2711] animate-spin mb-4"></div>
      <p className="text-sm font-semibold text-gray-700 font-serif">Completing QuickSolv authentication...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow bg-[#FCF9F5] text-gray-900 flex flex-col items-center justify-center py-20 px-6">
        <div className="w-10 h-10 rounded-full border-3 border-[#4A2711]/30 border-t-[#4A2711] animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-gray-700 font-serif">Completing authentication...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
