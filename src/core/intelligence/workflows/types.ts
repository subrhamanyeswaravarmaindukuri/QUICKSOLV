import { QuickSolvTaskType, QuickSolvRequest, QuickSolvToolExecutionRecord } from "../types";
import { QuickSolvToolPermission } from "../tools/types";
import { GeminiStudyResponse } from "@/services/ai/gemini";

export type QuickSolvReasoningStrategy =
  | "DIRECT"
  | "TOOL_ASSISTED"
  | "STRUCTURED"
  | "RESEARCH_ASSISTED"
  | "VISION_ASSISTED";

export interface QuickSolvWorkflowResult {
  studyResponse: GeminiStudyResponse;
  reasoningStrategy: QuickSolvReasoningStrategy;
  toolsExecuted: QuickSolvToolExecutionRecord[];
  selectedModel: string;
  selectedProvider: string;
  usage: {
    credits: number;
  };
  metadata?: Record<string, any>;
}

export interface QuickSolvWorkflow {
  readonly taskType: QuickSolvTaskType;
  readonly strategy: QuickSolvReasoningStrategy;
  execute(
    request: QuickSolvRequest,
    userPermission?: QuickSolvToolPermission
  ): Promise<QuickSolvWorkflowResult>;
}
