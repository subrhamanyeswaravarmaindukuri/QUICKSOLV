"use client";

import React, { useEffect, useState } from "react";
import { DeveloperNavbar } from "@/components/developer/DeveloperNavbar";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Clock,
  CheckCircle2
} from "lucide-react";

interface ApiKeyMeta {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
  rate_limit_rpm: number;
  monthly_credit_limit: number;
}

export default function DeveloperKeysPage() {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["solve:read", "chat:write"]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // One-Time Secret Display Modal
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/developer/keys");
      if (res.ok) {
        const json = await res.json();
        setKeys(json.keys || []);
      }
    } catch (err) {
      console.error("Failed to load keys:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      setCreateError("Key name is required.");
      return;
    }
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName.trim(),
          scopes: selectedScopes
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setCreateError(json.error?.message || "Failed to create API key.");
        return;
      }

      // Show one-time secret modal
      setCreatedSecret(json.secretKey);
      setShowCreateModal(false);
      setKeyName("");
      setSelectedScopes(["solve:read", "chat:write"]);
      await loadKeys();
    } catch (err: any) {
      setCreateError(err.message || "Network error creating API key.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke the API key "${name}"? This action cannot be undone.`)) {
      return;
    }
    setRevokingId(keyId);
    try {
      const res = await fetch(`/api/developer/keys/${keyId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setKeys((prev) =>
          prev.map((k) =>
            k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k
          )
        );
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
    } finally {
      setRevokingId(null);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const copySecret = () => {
    if (!createdSecret) return;
    navigator.clipboard.writeText(createdSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <DeveloperNavbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Key className="h-6 w-6 text-indigo-400" />
              API Key Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Create, view metadata, and manage access keys for QuickSolv Developer APIs.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create New API Key</span>
          </button>
        </div>

        {/* Security Banner */}
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-amber-200/90 text-xs flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">Secret Security Policy</p>
            <p className="text-slate-300 leading-relaxed">
              API key secrets (`qs_live_...`) are hashed using SHA-256 before storage. Full secrets are displayed ONCE upon creation and cannot be retrieved again. Keep your keys secret and never commit them to public repositories.
            </p>
          </div>
        </div>

        {/* Keys Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Key Name</th>
                  <th className="px-6 py-3.5 font-semibold">Prefix</th>
                  <th className="px-6 py-3.5 font-semibold">Scopes</th>
                  <th className="px-6 py-3.5 font-semibold">Created</th>
                  <th className="px-6 py-3.5 font-semibold">Last Used</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Loading API keys...
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 space-y-2">
                      <Key className="h-8 w-8 mx-auto text-slate-600" />
                      <p className="font-medium text-slate-300">No API keys generated yet</p>
                      <p className="text-xs text-slate-500">Click "Create New API Key" above to generate your first live developer key.</p>
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => {
                    const isRevoked = !!k.revoked_at;
                    return (
                      <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">
                          {k.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-indigo-300 text-xs">
                          {k.key_prefix}...
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes?.map((s) => (
                              <span
                                key={s}
                                className="rounded border border-indigo-800/50 bg-indigo-950/60 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(k.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                          {k.last_used_at
                            ? new Date(k.last_used_at).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                              Revoked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {!isRevoked && (
                            <button
                              onClick={() => handleRevokeKey(k.id, k.name)}
                              disabled={revokingId === k.id}
                              className="inline-flex items-center gap-1 rounded border border-rose-900/60 bg-rose-950/30 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-900/50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{revokingId === k.id ? "Revoking..." : "Revoke"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CREATE KEY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-400" />
                Create New API Key
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="rounded-lg bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateKey} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Key Name</label>
                <input
                  type="text"
                  placeholder="e.g. Production Web App"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-2">Allowed API Scopes</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes("solve:read")}
                      onChange={() => toggleScope("solve:read")}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-200">solve:read</span>
                    <span className="text-[11px] text-slate-500">(Access POST /api/v1/solve)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes("chat:write")}
                      onChange={() => toggleScope("chat:write")}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-200">chat:write</span>
                    <span className="text-[11px] text-slate-500">(Access POST /api/v1/chat)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes("code:full")}
                      onChange={() => toggleScope("code:full")}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-200">code:full</span>
                    <span className="text-[11px] text-slate-500">(Full code execution scope)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {creating ? "Generating..." : "Generate Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME SECRET DISPLAY MODAL */}
      {createdSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-indigo-500/50 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Save Your API Key Secret</h3>
            </div>

            <div className="rounded-lg bg-amber-950/40 border border-amber-800/60 p-3 text-xs text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1 text-amber-300">
                <AlertTriangle className="h-4 w-4" /> Save this API key now. You won't be able to view it again.
              </p>
              <p className="text-slate-300">
                For security reasons, QuickSolv hashes all keys and does not store plaintext secrets.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Your New Secret Key</label>
              <div className="flex items-center gap-2 rounded-lg border border-indigo-900 bg-slate-950 p-3 font-mono text-xs text-indigo-300 break-all select-all">
                <span>{createdSecret}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={copySecret}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                {copiedSecret ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copiedSecret ? "Copied to Clipboard!" : "Copy Key Secret"}</span>
              </button>

              <button
                onClick={() => setCreatedSecret(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Done / Saved Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
