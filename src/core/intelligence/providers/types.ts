import { GeminiStudyResponse } from "@/services/ai/gemini";
import { QuickSolvTaskType } from "../types";

export interface QuickSolvAIRequest {
  prompt: string;
  taskType?: QuickSolvTaskType;
  mode?: string;
  modelOverride?: string;
  userName?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  image?: { mimeType: string; data: string; highResolution?: boolean };
  pdf?: { mimeType: string; data: string };
  userGeminiKey?: string;
  userOpenRouterKey?: string;
  toolContext?: string;
}

export interface QuickSolvAIResponse {
  studyResponse: GeminiStudyResponse;
  text: string;
  selectedModel: string;
  selectedProvider: string;
  durationMs: number;
  usage: {
    credits: number;
  };
}

export interface QuickSolvAIProviderAdapter {
  id: string;
  name: string;
  supportedModels: string[];
  supportedCapabilities: QuickSolvTaskType[];
  generate(request: QuickSolvAIRequest): Promise<QuickSolvAIResponse>;
}
