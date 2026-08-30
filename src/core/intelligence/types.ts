import { GeminiStudyResponse } from "@/services/ai/gemini";

export type QuickSolvTaskType =
  | "GENERAL_CHAT"
  | "RESEARCH"
  | "CODING"
  | "MATH"
  | "STUDY"
  | "DOCUMENT"
  | "VISION"
  | "CREATIVE"
  | "IMAGE_GENERATION"
  | "OTHER";

export interface QuickSolvImageInput {
  mimeType: string;
  data: string;
  highResolution?: boolean;
}

export interface QuickSolvPdfInput {
  mimeType: string;
  data: string;
}

export interface QuickSolvRequest {
  prompt: string;
  mode?: string;
  taskType?: QuickSolvTaskType;
  modelOverride?: string;
  userName?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  image?: QuickSolvImageInput;
  pdf?: QuickSolvPdfInput;
  userGeminiKey?: string;
  userOpenRouterKey?: string;
  clientContext?: Record<string, any>;
}

export interface QuickSolvToolExecutionRecord {
  toolId: string;
  toolName: string;
  input: any;
  output: any;
  success: boolean;
  durationMs: number;
}

export interface QuickSolvResponse {
  studyResponse: GeminiStudyResponse;
  taskType: QuickSolvTaskType;
  selectedModel: string;
  selectedProvider: string;
  toolsExecuted: QuickSolvToolExecutionRecord[];
  usage: {
    credits: number;
  };
  metadata?: Record<string, any>;
}

export interface QuickSolvProviderConfig {
  id: string;
  name: string;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  supportedTaskTypes: QuickSolvTaskType[];
}
