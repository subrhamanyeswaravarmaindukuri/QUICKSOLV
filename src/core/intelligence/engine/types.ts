import { QuickSolvToolPermission } from "../tools/types";
import { QuickSolvTaskType } from "../types";

export interface QuickSolvExecutionContext {
  correlationId: string;
  startTime: number;
  userPermission: QuickSolvToolPermission;
  taskType?: QuickSolvTaskType;
  selectedModel?: string;
  selectedProvider?: string;
  latencyMs?: number;
  success?: boolean;
  failureCategory?: string;
}

export interface QuickSolvQualityCheckResult {
  passed: boolean;
  reasons: string[];
  sanitized: boolean;
}

export interface QuickSolvMultimodalValidationResult {
  valid: boolean;
  error?: string;
}
