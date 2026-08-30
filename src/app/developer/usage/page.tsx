"use client";

import React, { useEffect, useState } from "react";
import { DeveloperNavbar } from "@/components/developer/DeveloperNavbar";
import {
  BarChart2,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Key,
  Calendar,
  Layers
} from "lucide-react";

export default function DeveloperUsagePage() {
  const [usage, setUsage] = useState<{
    creditsUsed: number;
    monthlyLimit: number;
    remainingCredits: number;
    activeKeysCount: number;
    rateLimitRpm: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetch("/api/developer/usage");
        if (res.ok) {
          const json = await res.json();
          setUsage(json.usage);
        }
      } catch (err) {
        console.error("Failed to load usage data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUsage();
  }, []);

  const creditsUsed = usage?.creditsUsed ?? 0;
  const monthlyLimit = usage?.monthlyLimit ?? 1000;
  const usagePercentage = Math.min(100, Math.round((creditsUsed / monthlyLimit) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <DeveloperNavbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-emerald-400" />
            API Usage & Credit Accounting
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time metric monitoring for API requests, credit consumption, and monthly quota limits.
          </p>
        </div>

        {/* Quota Progress Bar Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Credit Quota</span>
              <h2 className="text-xl font-bold text-white">
                {loading ? "..." : `${creditsUsed.toLocaleString()} / ${monthlyLimit.toLocaleString()} Credits Consumed`}
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <span>Current Cycle: August 2026</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  usagePercentage > 85
                    ? "bg-rose-500"
                    : usagePercentage > 60
                    ? "bg-amber-500"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 pt-1">
              <span>{usagePercentage}% Quota Used</span>
              <span>{(usage?.remainingCredits ?? 1000).toLocaleString()} Credits Remaining</span>
            </div>
          </div>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total API Requests</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{loading ? "..." : creditsUsed}</div>
            <p className="mt-1 text-[11px] text-slate-500">Calculated from API activity log</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Active Keys Limit</span>
              <Key className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{loading ? "..." : usage?.activeKeysCount ?? 0}</div>
            <p className="mt-1 text-[11px] text-slate-500">Active keys authorized</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Rate Limit Enforcement</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{loading ? "..." : `${usage?.rateLimitRpm ?? 60} RPM`}</div>
            <p className="mt-1 text-[11px] text-slate-500">Token bucket sliding window</p>
          </div>
        </div>

        {/* Endpoint Credit Pricing Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            Endpoint Credit Costs
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-indigo-300 font-semibold">POST /api/v1/chat</span>
                <span className="rounded bg-indigo-950 border border-indigo-800 px-2 py-0.5 text-xs text-indigo-300">1 Credit / Req</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Standard conversational study queries, general questions, prompt analysis, and intent classification.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-purple-300 font-semibold">POST /api/v1/solve</span>
                <span className="rounded bg-purple-950 border border-purple-800 px-2 py-0.5 text-xs text-purple-300">1-2 Credits / Req</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Structured solutions with MathJS verification (1 credit for text/math/code, 2 credits for base64 image vision requests).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
