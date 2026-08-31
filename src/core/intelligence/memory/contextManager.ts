import { QuickSolvMemoryEntry, QuickSolvConversationContext, QuickSolvContextSelection } from "./types";
import { quickSolvMemoryGuard } from "./memoryGuard";
import { quickSolvRelevanceSelector } from "./relevance";

export class QuickSolvContextManager {
  /**
   * Processes, sanitizes, and prepares conversation history into a safe model-ready context payload.
   */
  processContext(
    currentPrompt: string,
    rawHistory?: Array<{ role: "user" | "assistant"; content: string }>
  ): {
    normalizedHistory: Array<{ role: "user" | "assistant"; content: string }>;
    selectionInfo: QuickSolvContextSelection;
  } {
    if (!rawHistory || rawHistory.length === 0) {
      return {
        normalizedHistory: [],
        selectionInfo: { selectedEntries: [], truncatedCount: 0 }
      };
    }

    // 1. Normalize entries
    const entries: QuickSolvMemoryEntry[] = rawHistory.map(item => ({
      role: item.role,
      content: String(item.content || "")
    }));

    // 2. Run Memory Guard Sanitization
    const safetyCheck = quickSolvMemoryGuard.sanitizeHistory(entries);

    // 3. Run Relevance Selection
    const selection = quickSolvRelevanceSelector.selectContext(currentPrompt, safetyCheck.sanitizedEntries);

    // 4. Convert back to exact compatible history format
    const normalizedHistory = selection.selectedEntries.map(item => ({
      role: item.role,
      content: item.content
    }));

    return {
      normalizedHistory,
      selectionInfo: selection
    };
  }
}

export const quickSolvContextManager = new QuickSolvContextManager();
