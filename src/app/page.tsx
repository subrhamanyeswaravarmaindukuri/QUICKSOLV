"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Upload, Clipboard, ArrowRight, Send, Star, GraduationCap, MoreHorizontal, Lightbulb, Zap } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [promptInput, setPromptInput] = useState("");

  useEffect(() => {
    // Check long-term Firebase session
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        const userObj = {
          id: user.uid,
          email: user.email || "user@quicksolv.edu",
          name: user.displayName || user.email?.split("@")[0] || "QuickSolv User",
          photoURL: user.photoURL
        };
        localStorage.setItem("snaptutor_user", JSON.stringify(userObj));
      } else {
        const saved = localStorage.getItem("snaptutor_user");
        if (saved) {
          setIsLoggedIn(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAction = () => {
    if (isLoggedIn) {
      router.push("/chat");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#FCF9F5] text-gray-900 flex flex-col font-sans antialiased selection:bg-[#4A2711]/10 selection:text-[#4A2711] lg:overflow-hidden">
      
      {/* Header */}
      <header className="border-b border-gray-200/50 bg-[#FCF9F5] shrink-0">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 lg:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4A2711] flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-950 font-serif">
              QuickSolv
            </span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link
              href={isLoggedIn ? "/chat" : "/login"}
              className="text-sm font-semibold text-gray-700 hover:text-[#4A2711] transition duration-200"
            >
              {isLoggedIn ? "Go to App" : "Log in"}
            </Link>
            <button
              onClick={handleAction}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#4A2711] hover:bg-[#5c3216] rounded-lg transition duration-200 shadow-md shadow-[#4A2711]/10 cursor-pointer"
            >
              {isLoggedIn ? "Open Dashboard" : "Get Started Free"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-4 lg:py-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center overflow-y-auto lg:overflow-visible">
        
        {/* Left Column (Hero copy and Input form) */}
        <div className="space-y-4 lg:space-y-5 max-w-xl">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.1] font-serif">
            Don't just get <br />
            the answer. <br />
            <span className="text-[#4A2711]">Understand it.</span>
          </h1>

          <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
            Upload a screenshot, ask a question, or paste your notes. <br />
            Get clear explanations, formulas, examples and exam-ready answers in seconds.
          </p>

          {/* Central Input Box */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm relative focus-within:ring-2 focus-within:ring-[#4A2711]/20 focus-within:border-[#4A2711]/50 transition duration-200">
            <textarea
              rows={2}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask anything or upload a screenshot..."
              className="w-full bg-transparent border-0 focus:ring-0 text-sm focus:outline-none resize-none text-gray-800 placeholder-gray-400 py-0.5"
            />
            
            {/* Input card controls row */}
            <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 mt-1.5">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAction}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-400" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-gray-400" />
                  Paste
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <select className="bg-transparent border-0 focus:ring-0 text-xs text-gray-650 cursor-pointer outline-none font-semibold">
                  <option>All-in-One</option>
                  <option>Easy Explanation</option>
                  <option>Normal Steps</option>
                  <option>Research Mode</option>
                </select>
                <button
                  onClick={handleAction}
                  className="w-8 h-8 rounded-lg bg-[#4A2711] hover:bg-[#5c3216] text-white flex items-center justify-center shadow-sm transition cursor-pointer"
                >
                  <Send className="w-4 h-4 transform rotate-45 -translate-x-0.5 translate-y-0.5 fill-white text-[#4A2711]" />
                </button>
              </div>
            </div>
          </div>

          {/* Large CTA Button */}
          <div className="space-y-2">
            <button
              onClick={handleAction}
              className="w-full h-12 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-[#4A2711]/15 transform hover:-translate-y-0.5 text-sm md:text-base cursor-pointer"
            >
              {isLoggedIn ? "Open QuickSolv Dashboard" : "Get Started Free"}
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="text-center text-[11px] text-gray-450">
              No credit card required
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex items-center space-x-3 pt-1">
            <div className="flex -space-x-2">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100"
                alt="Avatar 1"
                className="w-7 h-7 rounded-full border-2 border-[#FCF9F5] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100"
                alt="Avatar 2"
                className="w-7 h-7 rounded-full border-2 border-[#FCF9F5] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100"
                alt="Avatar 3"
                className="w-7 h-7 rounded-full border-2 border-[#FCF9F5] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100&h=100"
                alt="Avatar 4"
                className="w-7 h-7 rounded-full border-2 border-[#FCF9F5] object-cover"
              />
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex text-amber-500">
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
              </div>
              <span className="text-xs text-gray-550 font-medium">
                Loved by 50K+ students
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (High Fidelity Preview Card Mockup) */}
        <div className="relative justify-self-center lg:justify-self-end w-full max-w-[460px]">
          
          {/* Card Frame */}
          <div className="bg-white border border-gray-200/60 rounded-3xl p-4 lg:p-5 shadow-xl space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#FAF5EE] border border-[#E9DFD3] flex items-center justify-center text-[#4A2711]">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">QuickSolv AI</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Online
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-650">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Message Thread */}
            <div className="space-y-3 text-xs">
              
              {/* User Bubble */}
              <div className="flex flex-col items-end space-y-1">
                <div className="bg-[#F7F2EB] text-gray-800 px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%] leading-relaxed text-[11px]">
                  Explain Newton's second law
                </div>
                <div className="text-[9px] text-gray-450 px-1">10:30 AM</div>
              </div>

              {/* AI Bubble */}
              <div className="flex flex-col items-start space-y-2">
                <div className="flex items-start space-x-2 max-w-[98%]">
                  <div className="w-6 h-6 rounded-full bg-[#FAF5EE] border border-[#E9DFD3] flex items-center justify-center text-[#4A2711] shrink-0 mt-0.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-2">
                    
                    {/* General Text Bubble */}
                    <div className="bg-white border border-gray-250/60 p-2.5 rounded-2xl rounded-tl-sm text-gray-800 leading-relaxed shadow-sm text-[11px]">
                      <div className="font-semibold text-gray-900 text-[10px] mb-0.5">QuickSolv AI</div>
                      Newton's second law states that the force on an object is equal to the mass of the object multiplied by its acceleration.
                      <div className="text-[9px] text-gray-450 mt-1 text-right">10:30 AM</div>
                    </div>

                    {/* Formula Card inside flow */}
                    <div className="bg-[#FAF6F0] border border-[#EADDC9]/50 rounded-2xl p-3 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[#704F37] font-semibold text-[10px]">
                        <Zap className="w-3 h-3 fill-[#704F37] text-[#704F37]" />
                        Formula
                      </div>
                      <div className="font-serif font-bold text-center text-xs py-0.5 border-y border-[#EADDC9]/30 text-gray-900">
                        F = ma
                      </div>
                      <div className="space-y-0.5 text-gray-500 text-[9.5px] leading-relaxed">
                        <div>Where,</div>
                        <ul className="list-disc list-inside pl-1 space-y-0.5">
                          <li>F = Force (in Newtons)</li>
                          <li>m = Mass (in kg)</li>
                          <li>a = Acceleration (in m/s²)</li>
                        </ul>
                      </div>
                    </div>

                    {/* Example Card inside flow */}
                    <div className="bg-[#FAF6F0] border border-[#EADDC9]/50 rounded-2xl p-3 space-y-1 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[#704F37] font-semibold text-[10px]">
                        <Lightbulb className="w-3 h-3 text-[#704F37]" />
                        Example
                      </div>
                      <p className="text-gray-500 leading-relaxed text-[9.5px]">
                        When you push a shopping cart with more force, it accelerates more. If the cart has more mass, it accelerates less.
                      </p>
                    </div>

                    {/* Chat indicator bubble */}
                    <div className="bg-white border border-gray-250/60 px-3 py-1.5 rounded-2xl rounded-tl-sm inline-flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 py-3 bg-[#FCF9F5] text-center text-xs text-gray-500 shrink-0">
        <p>&copy; {new Date().getFullYear()} QuickSolv AI. All rights reserved. Snap it. Understand it. Remember it.</p>
      </footer>
    </div>
  );
}
