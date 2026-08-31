"use client";

import React, { useEffect, useState } from "react";
import { DeveloperNavbar } from "@/components/developer/DeveloperNavbar";
import {
  BarChart2,
  Zap,
  Activity,
  CheckCircle2,
  Key,
  Calendar,
  Layers,
  Crown,
  CreditCard,
  Check,
  ArrowRight
} from "lucide-react";

export default function DeveloperUsagePage() {
  const [usage, setUsage] = useState<{
    creditsUsed: number;
    monthlyLimit: number;
    remainingCredits: number;
    activeKeysCount: number;
    rateLimitRpm: number;
  } | null>(null);

  const [subData, setSubData] = useState<{
    plan: string;
    status: string;
    billingInterval: string;
    credits: {
      mode: string;
      monthly: number | null;
      used: number;
      remaining: number | null;
    };
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsageAndSubscription() {
      try {
        const [usageRes, subRes] = await Promise.all([
          fetch("/api/developer/usage"),
          fetch("/api/billing/subscription")
        ]);

        if (usageRes.ok) {
          const json = await usageRes.json();
          setUsage(json.usage);
        }
        if (subRes.ok) {
          const subJson = await subRes.json();
          if (subJson.success) {
            setSubData(subJson.subscription);
          }
        }
      } catch (err) {
        console.error("Failed to load usage or subscription data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUsageAndSubscription();
  }, []);

  const handleCheckout = async (targetTier: "plus" | "pro") => {
    setCheckoutLoading(targetTier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTier,
          interval: billingInterval,
          successUrl: window.location.origin + "/developer/usage?checkout=success",
          cancelUrl: window.location.origin + "/developer/usage?checkout=cancel"
        })
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Failed to initiate checkout");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Error contacting billing server");
    } finally {
      setCheckoutLoading(null);
    }
  };

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
            API Usage & Subscription Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time metric monitoring for API requests, credit consumption, and subscription entitlement tiers.
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
              <span>Current Cycle: Active Period</span>
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

        {/* Subscription Plan Status & Upgrade Flow */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-950/80 border border-indigo-800 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                Active Subscription: <span className="uppercase font-bold text-amber-300">{subData?.plan || "Free"}</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-2">Choose Your QuickSolv Plan</h2>
              <p className="text-xs text-slate-400">Upgrade to Plus or Pro for expanded monthly credit limits and unlimited solving capabilities.</p>
            </div>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  billingInterval === "monthly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  billingInterval === "yearly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Yearly Billing <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded">16% OFF</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Free Tier */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Free Plan</h3>
                <p className="text-xs text-slate-400 mt-1">Basic study explainers & monthly credits.</p>
                <div className="mt-4 text-2xl font-extrabold text-white">$0 <span className="text-xs text-slate-400 font-normal">/ month</span></div>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 150 AI credits / month</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Standard AI chat & solver</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 1 credit per standard request</li>
                </ul>
              </div>
              <button disabled className="w-full py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 cursor-default">
                Current Plan
              </button>
            </div>

            {/* Plus Tier */}
            <div className="rounded-xl border border-indigo-700/60 bg-indigo-950/20 p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                Popular
              </div>
              <div>
                <h3 className="text-base font-bold text-white">QuickSolv Plus</h3>
                <p className="text-xs text-indigo-200/80 mt-1">High-volume solving & vision capabilities.</p>
                <div className="mt-4 text-2xl font-extrabold text-white">
                  {billingInterval === "yearly" ? "$99.99" : "$9.99"}
                  <span className="text-xs text-slate-400 font-normal"> / {billingInterval === "yearly" ? "year ($8.33/mo)" : "month"}</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 600 AI credits / month</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Priority response processing</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Multimodal Vision solver (2 credits)</li>
                </ul>
              </div>
              <button
                onClick={() => handleCheckout("plus")}
                disabled={checkoutLoading === "plus"}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {checkoutLoading === "plus" ? "Processing..." : "Upgrade to Plus"}
              </button>
            </div>

            {/* Pro Tier */}
            <div className="rounded-xl border border-amber-600/50 bg-amber-950/10 p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-amber-300 flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-400" /> QuickSolv Pro
                </h3>
                <p className="text-xs text-slate-400 mt-1">Unlimited solving for power users & developers.</p>
                <div className="mt-4 text-2xl font-extrabold text-white">
                  {billingInterval === "yearly" ? "$299.99" : "$29.99"}
                  <span className="text-xs text-slate-400 font-normal"> / {billingInterval === "yearly" ? "year ($24.99/mo)" : "month"}</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Unlimited AI chat & solving</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> High-throughput fair-use quota</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Developer sandbox & API access</li>
                </ul>
              </div>
              <button
                onClick={() => handleCheckout("pro")}
                disabled={checkoutLoading === "pro"}
                className="w-full py-2.5 rounded-lg bg-amber-600 text-xs font-semibold text-white hover:bg-amber-500 shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Crown className="h-4 w-4" />
                {checkoutLoading === "pro" ? "Processing..." : "Upgrade to Pro"}
              </button>
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
