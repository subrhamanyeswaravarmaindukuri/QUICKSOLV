import { QuickSolvTaskType } from "../types";

export type QuickSolvResponseMode =
  | "DIRECT_ANSWER"
  | "STEP_BY_STEP"
  | "DEEP_EXPLANATION"
  | "TUTORIAL"
  | "CODE_SOLUTION"
  | "DEBUGGING"
  | "STUDY_MODE"
  | "EXAM_MODE"
  | "RESEARCH_MODE"
  | "COMPARISON"
  | "SUMMARY"
  | "BRAINSTORM"
  | "CREATIVE"
  | "ACTION_PLAN"
  | "DOCUMENT_ANALYSIS"
  | "VISION_ANALYSIS";

export interface QuickSolvIntentDepth {
  taskType: QuickSolvTaskType;
  responseMode: QuickSolvResponseMode;
  requiresTools: boolean;
  requiresStructuredOutput: boolean;
  requiresVerification: boolean;
  requiresContext: boolean;
  verbosityLevel: "concise" | "normal" | "detailed";
}

export interface QuickSolvResponseStrategyRequirements {
  intentDepth: QuickSolvIntentDepth;
  requiredSections?: string[];
  expectedFormat?: string;
  minContentLength?: number;
}
