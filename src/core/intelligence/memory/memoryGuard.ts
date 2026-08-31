import { QuickSolvMemoryEntry, QuickSolvMemorySafetyResult } from "./types";

export class QuickSolvMemoryGuard {
  /**
   * Sanitizes historical entries, redacting any embedded API keys, secrets, or prompt injection instructions.
   */
  sanitizeHistory(entries: QuickSolvMemoryEntry[]): QuickSolvMemorySafetyResult {
    const reasons: string[] = [];
    const sanitizedEntries: QuickSolvMemoryEntry[] = [];

    for (const entry of entries) {
      let content = entry.content || "";

      // 1. Secret Isolation & Redaction
      if (
        content.includes("OX_ALPHA_API_KEY") ||
        content.includes("GEMINI_API_KEY") ||
        content.includes("PATSNAP_API_KEY") ||
        /sk-[a-zA-Z0-9]{20,}/.test(content) ||
        /Bearer\s+[a-zA-Z0-9._-]{20,}/.test(content)
      ) {
        reasons.push("Redacted secret token found in conversation history.");
        content = content
          .replace(/OX_ALPHA_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
          .replace(/GEMINI_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
          .replace(/PATSNAP_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
          .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED_TOKEN]")
          .replace(/Bearer\s+[a-zA-Z0-9._-]{20,}/g, "Bearer [REDACTED_TOKEN]");
      }

      // 2. Neutralize Prompt Injection in Historical Content
      if (/ignore\s+(all\s+)?(system|previous)\s+instructions/i.test(content)) {
        reasons.push("Neutralized prompt injection instruction in historical context.");
        content = content.replace(/ignore\s+(all\s+)?(system|previous)\s+instructions/gi, "[Filtered User Note]");
      }

      sanitizedEntries.push({
        ...entry,
        content
      });
    }

    return {
      safe: reasons.length === 0,
      sanitizedEntries,
      reasons
    };
  }
}

export const quickSolvMemoryGuard = new QuickSolvMemoryGuard();
