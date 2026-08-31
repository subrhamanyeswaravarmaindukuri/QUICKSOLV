export interface QuickSolvMemoryEntry {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  topic?: string;
  hasCode?: boolean;
  hasMath?: boolean;
}

export interface QuickSolvConversationContext {
  conversationId?: string;
  userId?: string;
  entries: QuickSolvMemoryEntry[];
  activeTopic?: string;
  totalChars: number;
}

export interface QuickSolvContextSelection {
  selectedEntries: QuickSolvMemoryEntry[];
  summary?: string;
  truncatedCount: number;
}

export interface QuickSolvMemorySafetyResult {
  safe: boolean;
  sanitizedEntries: QuickSolvMemoryEntry[];
  reasons: string[];
}
