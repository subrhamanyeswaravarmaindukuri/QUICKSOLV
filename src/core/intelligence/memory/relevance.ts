import { QuickSolvMemoryEntry, QuickSolvContextSelection } from "./types";

export class QuickSolvRelevanceSelector {
  private readonly MAX_SELECTED_TURNS = 20;
  private readonly MAX_TOTAL_CHARS = 15000;
  private readonly MAX_SINGLE_MESSAGE_CHARS = 4000;

  /**
   * Deterministically selects relevant historical context messages without triggering extra LLM calls.
   */
  selectContext(
    currentPrompt: string,
    history: QuickSolvMemoryEntry[]
  ): QuickSolvContextSelection {
    if (!history || history.length === 0) {
      return { selectedEntries: [], truncatedCount: 0 };
    }

    const pLower = currentPrompt.toLowerCase();
    const isReference =
      pLower.includes("it") ||
      pLower.includes("that") ||
      pLower.includes("previous") ||
      pLower.includes("again") ||
      pLower.includes("simpler") ||
      pLower.includes("recursive") ||
      pLower.includes("divide") ||
      pLower.includes("continue") ||
      pLower.includes("why");

    // 1. Bound single message lengths
    const boundedEntries: QuickSolvMemoryEntry[] = history.map(entry => {
      let content = entry.content;
      if (content.length > this.MAX_SINGLE_MESSAGE_CHARS) {
        content = content.slice(0, this.MAX_SINGLE_MESSAGE_CHARS) + "\n[Message content truncated for length]";
      }
      return { ...entry, content };
    });

    // 2. Select recent turns (up to MAX_SELECTED_TURNS)
    let selected = boundedEntries.slice(-this.MAX_SELECTED_TURNS);

    // 3. Enforce Total Character Bounds
    let currentChars = selected.reduce((acc, item) => acc + item.content.length, 0);
    let truncatedCount = Math.max(0, history.length - selected.length);

    while (currentChars > this.MAX_TOTAL_CHARS && selected.length > 2) {
      const removed = selected.shift();
      if (removed) {
        currentChars -= removed.content.length;
        truncatedCount++;
      }
    }

    return {
      selectedEntries: selected,
      summary: isReference ? "Conversational reference detected; historical context retained." : undefined,
      truncatedCount
    };
  }
}

export const quickSolvRelevanceSelector = new QuickSolvRelevanceSelector();
