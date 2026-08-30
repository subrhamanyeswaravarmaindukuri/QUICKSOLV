"use client";

import React, { useState } from "react";
import { DeveloperNavbar } from "@/components/developer/DeveloperNavbar";
import {
  Terminal,
  Play,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function DeveloperPlaygroundPage() {
  const [endpoint, setEndpoint] = useState<"/api/v1/solve" | "/api/v1/chat">("/api/v1/solve");
  const [apiKey, setApiKey] = useState("qs_test_demo_key_12345");
  const [model, setModel] = useState("auto");
  const [inputText, setInputText] = useState("Solve the equation 3x + 12 = 30 and show step-by-step calculations.");

  // Output states
  const [running, setRunning] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [responseJson, setResponseJson] = useState<any | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const handleRun = async () => {
    if (!apiKey.trim()) {
      alert("Please enter a valid QuickSolv API key.");
      return;
    }
    if (!inputText.trim()) {
      alert("Please enter input problem or message text.");
      return;
    }

    setRunning(true);
    setStatusCode(null);
    setLatencyMs(null);
    setResponseJson(null);

    const startTime = performance.now();

    try {
      const payload =
        endpoint === "/api/v1/solve"
          ? { problem: inputText.trim(), model }
          : { message: inputText.trim(), model };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));
      setStatusCode(res.status);

      const data = await res.json();
      setResponseJson(data);
    } catch (err: any) {
      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));
      setStatusCode(500);
      setResponseJson({
        error: {
          code: "CLIENT_FETCH_ERROR",
          message: err.message || "Failed to communicate with API server."
        }
      });
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setEndpoint("/api/v1/solve");
    setModel("auto");
    setInputText("Solve the equation 3x + 12 = 30 and show step-by-step calculations.");
    setStatusCode(null);
    setLatencyMs(null);
    setResponseJson(null);
  };

  const copyResponse = () => {
    if (!responseJson) return;
    navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <DeveloperNavbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="h-6 w-6 text-purple-400" />
            Developer API Playground
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Test QuickSolv REST endpoints interactively, inspect live HTTP responses, latency, and credit consumption.
          </p>
        </div>

        {/* Playground Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Request Configurator (Left) */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Request Setup</h2>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Endpoint Selector */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Target Endpoint</label>
                <select
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-indigo-300 font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value="/api/v1/solve">POST /api/v1/solve</option>
                  <option value="/api/v1/chat">POST /api/v1/chat</option>
                </select>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Bearer API Key</label>
                <input
                  type="password"
                  placeholder="qs_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Keys are sent over TLS in Authorization headers and never saved in storage.
                </span>
              </div>

              {/* Model Selector */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Model Engine</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="auto">auto (QuickSolv AI Router)</option>
                  <option value="google/gemini-2.5-flash">google/gemini-2.5-flash</option>
                  <option value="openai/gpt-4o">openai/gpt-4o</option>
                </select>
              </div>

              {/* Input Prompt / Problem Text */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {endpoint === "/api/v1/solve" ? "Problem Payload (problem)" : "Chat Message (message)"}
                </label>
                <textarea
                  rows={5}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter problem text..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Run Button */}
              <button
                onClick={handleRun}
                disabled={running}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{running ? "Processing Request..." : "Run Request"}</span>
              </button>
            </div>
          </div>

          {/* Response Inspector (Right) */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Response Inspector</h2>
                  {statusCode !== null && (
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-mono font-bold ${
                        statusCode >= 200 && statusCode < 300
                          ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                          : "border-rose-800 bg-rose-950 text-rose-300"
                      }`}
                    >
                      HTTP {statusCode}
                    </span>
                  )}
                </div>

                {latencyMs !== null && (
                  <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{latencyMs} ms</span>
                  </span>
                )}
              </div>

              {/* Pretty JSON Response Body */}
              <div className="relative min-h-[300px]">
                {responseJson ? (
                  <pre className="overflow-x-auto rounded-lg bg-slate-900/90 p-4 text-xs font-mono text-indigo-200 border border-slate-800 leading-relaxed max-h-[450px]">
                    {JSON.stringify(responseJson, null, 2)}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-slate-800 rounded-lg p-6 text-center space-y-2">
                    <Terminal className="h-10 w-10 text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">Sandbox Ready</p>
                    <p className="text-xs text-slate-600 max-w-xs">
                      Click "Run Request" to send a live query and inspect returned status codes and JSON payloads.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Response Actions */}
            {responseJson && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  {responseJson.usage?.creditsUsed
                    ? `Credits Consumed: ${responseJson.usage.creditsUsed}`
                    : "Live REST Execution"}
                </span>

                <button
                  onClick={copyResponse}
                  className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  {copiedResponse ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>{copiedResponse ? "Copied" : "Copy Response JSON"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
