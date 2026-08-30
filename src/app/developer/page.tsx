"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DeveloperNavbar } from "@/components/developer/DeveloperNavbar";
import {
  Key,
  BarChart2,
  BookOpen,
  Terminal,
  Zap,
  ShieldCheck,
  ArrowRight,
  Code2,
  Activity,
  CheckCircle2,
  Copy,
  Check
} from "lucide-react";

export default function DeveloperOverviewPage() {
  const [usageData, setUsageData] = useState<{
    creditsUsed: number;
    monthlyLimit: number;
    remainingCredits: number;
    activeKeysCount: number;
    rateLimitRpm: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/developer/usage");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setUsageData(json.usage);
          }
        }
      } catch (err) {
        console.error("Failed to load usage data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, []);

  const sampleCurl = `curl -X POST https://quicksolv.edu/api/v1/solve \\
  -H "Authorization: Bearer YOUR_QUICKSOLV_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "problem": "Calculate integral of x^2 from 0 to 3",
    "model": "auto"
  }'`;

  const copySample = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <DeveloperNavbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-900/50 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Zap className="h-3.5 w-3.5" /> QuickSolv Developer API v1
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Power your applications with QuickSolv AI Core
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Integrate step-by-step problem solving, math verification, structured explanation engines, and AI study routing into your apps, services, and scientific workflows via secure REST endpoints.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/developer/keys"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
              >
                <Key className="h-4 w-4" />
                <span>Create API Key</span>
              </Link>
              <Link
                href="/developer/playground"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all"
              >
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>Open API Sandbox</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Keys */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Active API Keys</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
                <Key className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              {loading ? "..." : usageData?.activeKeysCount ?? 0}
            </div>
            <p className="mt-1 text-xs text-slate-500">Live developer keys created</p>
          </div>

          {/* Credits Used */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Monthly Usage</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <BarChart2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              {loading ? "..." : `${usageData?.creditsUsed ?? 0} / ${usageData?.monthlyLimit ?? 1000}`}
            </div>
            <p className="mt-1 text-xs text-slate-500">API credits consumed this month</p>
          </div>

          {/* Rate Limit */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Rate Limit</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              {loading ? "..." : `${usageData?.rateLimitRpm ?? 60} RPM`}
            </div>
            <p className="mt-1 text-xs text-slate-500">Requests per minute per key</p>
          </div>

          {/* Security Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Key Protection</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/40">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white">SHA-256</div>
            <p className="mt-1 text-xs text-slate-500">Hashed secret storage enabled</p>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/developer/keys"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-slate-900/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Key className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-white group-hover:text-indigo-300 transition-colors">
              API Key Management
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Generate secure API keys (`qs_live_...`), configure scopes, set expiration, and manage key revocation.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Manage keys</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/developer/usage"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-slate-900/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <BarChart2 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Usage & Accounting
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Track real credit consumption, inspect monthly quotas, monitor endpoint usage, and analyze request counts.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>View usage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/developer/docs"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-slate-900/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-white group-hover:text-sky-300 transition-colors">
              API Reference Docs
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Explore complete endpoint specs for `/api/v1/chat` and `/api/v1/solve` with request schemas and code snippets.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-sky-400 group-hover:translate-x-1 transition-transform">
              <span>Read docs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/developer/playground"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-slate-900/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Terminal className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-white group-hover:text-purple-300 transition-colors">
              Developer Playground
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Test endpoints live in your browser sandbox, inspect HTTP status codes, latency metrics, and JSON payloads.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Open sandbox</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>

        {/* Quick Start & Example Code */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Quick Start Steps */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">3-Step Quick Start</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Generate your API key</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Navigate to <Link href="/developer/keys" className="text-indigo-400 underline">API Keys</Link> and click "Create API Key" to obtain your secret.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Set HTTP Authorization Header</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Include <code className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-indigo-300">Authorization: Bearer YOUR_KEY</code> in every REST request.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Call Solution or Chat Endpoints</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Send POST requests to <code className="text-slate-300">/api/v1/solve</code> or <code className="text-slate-300">/api/v1/chat</code> to get structured solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick cURL Example */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sample Request (cURL)</span>
              <button
                onClick={copySample}
                className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                <span>{copiedCode ? "Copied" : "Copy cURL"}</span>
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-900/80 p-4 text-xs font-mono text-indigo-300 border border-slate-800 leading-relaxed">
              {sampleCurl}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
