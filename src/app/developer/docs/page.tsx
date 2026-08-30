"use client";

import React, { useState } from "react";
import { DeveloperNavbar } from "@/components/developer/DeveloperNavbar";
import {
  BookOpen,
  Code2,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Terminal,
  Layers,
  AlertTriangle,
  FileCode
} from "lucide-react";

export default function DeveloperDocsPage() {
  const [activeTab, setActiveTab] = useState<"solve" | "chat">("solve");
  const [copiedLang, setCopiedLang] = useState<string | null>(null);

  const solveCurl = `curl -X POST https://quicksolv.edu/api/v1/solve \\
  -H "Authorization: Bearer YOUR_QUICKSOLV_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "problem": "Solve 2x + 5 = 15",
    "model": "auto"
  }'`;

  const solveJs = `const response = await fetch("https://quicksolv.edu/api/v1/solve", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_QUICKSOLV_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    problem: "Solve 2x + 5 = 15",
    model: "auto"
  })
});

const data = await response.json();
console.log(data.solution.quick_answer);`;

  const solvePython = `import requests

url = "https://quicksolv.edu/api/v1/solve"
headers = {
    "Authorization": "Bearer YOUR_QUICKSOLV_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "problem": "Solve 2x + 5 = 15",
    "model": "auto"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(data["solution"]["quick_answer"])`;

  const chatCurl = `curl -X POST https://quicksolv.edu/api/v1/chat \\
  -H "Authorization: Bearer YOUR_QUICKSOLV_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Explain photosynthesis in simple terms",
    "model": "auto"
  }'`;

  const chatJs = `const response = await fetch("https://quicksolv.edu/api/v1/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_QUICKSOLV_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: "Explain photosynthesis in simple terms",
    model: "auto"
  })
});

const data = await response.json();
console.log(data.answer);`;

  const chatPython = `import requests

url = "https://quicksolv.edu/api/v1/chat"
headers = {
    "Authorization": "Bearer YOUR_QUICKSOLV_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "message": "Explain photosynthesis in simple terms",
    "model": "auto"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(data["answer"])`;

  const copyCode = (code: string, langKey: string) => {
    navigator.clipboard.writeText(code);
    setCopiedLang(langKey);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <DeveloperNavbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-sky-400" />
            QuickSolv API Documentation (v1)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete technical specification and code references for QuickSolv REST APIs.
          </p>
        </div>

        {/* Authentication Section */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 shadow-lg">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            Authentication & Bearer Tokens
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            All QuickSolv Developer API endpoints authenticate client requests via standard Bearer tokens. Pass your generated API key in the <code className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">Authorization</code> HTTP header.
          </p>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-indigo-300">
            Authorization: Bearer YOUR_QUICKSOLV_API_KEY
          </div>
        </div>

        {/* Endpoint Selector Tabs */}
        <div className="space-y-6">
          <div className="flex border-b border-slate-800 gap-4">
            <button
              onClick={() => setActiveTab("solve")}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "solve"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              POST /api/v1/solve
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "chat"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              POST /api/v1/chat
            </button>
          </div>

          {/* TAB 1: /api/v1/solve */}
          {activeTab === "solve" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white font-mono">POST</span>
                  <span className="font-mono text-base font-bold text-white">/api/v1/solve</span>
                  <span className="rounded border border-indigo-800 bg-indigo-950 px-2 py-0.5 text-xs text-indigo-300 font-mono">Required Scope: solve:read</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Solves complex academic, mathematical, coding, or scientific problems. Automatically resolves formulas via MathJS verification and generates step-by-step solutions.
                </p>
              </div>

              {/* Request Parameters */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">JSON Request Body</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2">Field</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                      <tr>
                        <td className="py-2.5 text-indigo-300 font-bold">problem</td>
                        <td className="py-2.5 text-slate-400">string</td>
                        <td className="py-2.5 text-emerald-400 font-sans font-bold">Yes</td>
                        <td className="py-2.5 text-slate-300 font-sans">The problem text or question to solve (max 50,000 chars).</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-indigo-300 font-bold">model</td>
                        <td className="py-2.5 text-slate-400">string</td>
                        <td className="py-2.5 text-slate-500 font-sans">No</td>
                        <td className="py-2.5 text-slate-300 font-sans">Model override (`auto`, `google/gemini-2.5-flash`, `openai/gpt-4o`). Defaults to `auto`.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-indigo-300 font-bold">image</td>
                        <td className="py-2.5 text-slate-400">object</td>
                        <td className="py-2.5 text-slate-500 font-sans">No</td>
                        <td className="py-2.5 text-slate-300 font-sans">Base64 image object (e.g. mimeType and base64 data). Costs 2 credits.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Code Snippets */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Code Examples</h3>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {/* cURL */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400">cURL</span>
                      <button onClick={() => copyCode(solveCurl, "solveCurl")} className="text-slate-400 hover:text-white">
                        {copiedLang === "solveCurl" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed max-h-48">
                      {solveCurl}
                    </pre>
                  </div>

                  {/* JavaScript */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400">JavaScript / Node.js</span>
                      <button onClick={() => copyCode(solveJs, "solveJs")} className="text-slate-400 hover:text-white">
                        {copiedLang === "solveJs" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed max-h-48">
                      {solveJs}
                    </pre>
                  </div>

                  {/* Python */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-400">Python</span>
                      <button onClick={() => copyCode(solvePython, "solvePython")} className="text-slate-400 hover:text-white">
                        {copiedLang === "solvePython" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed max-h-48">
                      {solvePython}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: /api/v1/chat */}
          {activeTab === "chat" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white font-mono">POST</span>
                  <span className="font-mono text-base font-bold text-white">/api/v1/chat</span>
                  <span className="rounded border border-indigo-800 bg-indigo-950 px-2 py-0.5 text-xs text-indigo-300 font-mono">Required Scope: chat:write</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Sends conversational chat prompts to QuickSolv AI Core. Supports message context history and intent detection.
                </p>
              </div>

              {/* Code Snippets */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Code Examples</h3>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {/* cURL */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400">cURL</span>
                      <button onClick={() => copyCode(chatCurl, "chatCurl")} className="text-slate-400 hover:text-white">
                        {copiedLang === "chatCurl" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed max-h-48">
                      {chatCurl}
                    </pre>
                  </div>

                  {/* JavaScript */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400">JavaScript / Node.js</span>
                      <button onClick={() => copyCode(chatJs, "chatJs")} className="text-slate-400 hover:text-white">
                        {copiedLang === "chatJs" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed max-h-48">
                      {chatJs}
                    </pre>
                  </div>

                  {/* Python */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-400">Python</span>
                      <button onClick={() => copyCode(chatPython, "chatPython")} className="text-slate-400 hover:text-white">
                        {copiedLang === "chatPython" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed max-h-48">
                      {chatPython}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Matrix */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Standard API Error Codes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2">Status</th>
                  <th className="py-2">Error Code</th>
                  <th className="py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                <tr>
                  <td className="py-2.5 text-rose-400 font-bold">400</td>
                  <td className="py-2.5 text-indigo-300 font-bold">INVALID_REQUEST</td>
                  <td className="py-2.5 text-slate-300 font-sans">Malformed JSON body, missing required fields, or length exceeding 50k chars.</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-rose-400 font-bold">401</td>
                  <td className="py-2.5 text-indigo-300 font-bold">UNAUTHORIZED</td>
                  <td className="py-2.5 text-slate-300 font-sans">Missing or invalid Bearer API key in Authorization header.</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-rose-400 font-bold">403</td>
                  <td className="py-2.5 text-indigo-300 font-bold">INSUFFICIENT_SCOPE</td>
                  <td className="py-2.5 text-slate-300 font-sans">API key missing required scope (e.g. `solve:read` or `chat:write`).</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-amber-400 font-bold">429</td>
                  <td className="py-2.5 text-indigo-300 font-bold">RATE_LIMIT_EXCEEDED</td>
                  <td className="py-2.5 text-slate-300 font-sans">Request count exceeded rate limit (60 RPM) or monthly credit quota.</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-rose-400 font-bold">500</td>
                  <td className="py-2.5 text-indigo-300 font-bold">INTERNAL_ERROR</td>
                  <td className="py-2.5 text-slate-300 font-sans">Sanitized backend AI processing exception. Stack traces are suppressed.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
