import { QuickSolvWorkflowResult } from "../workflows/types";
import { QuickSolvQualityCheckResult } from "./types";

export class QuickSolvQualityGate {
  /**
   * Performs deterministic quality & security checks on workflow execution result.
   */
  validatePayload(result: QuickSolvWorkflowResult): QuickSolvQualityCheckResult {
    const reasons: string[] = [];

    if (!result || !result.studyResponse) {
      return {
        passed: false,
        reasons: ["Empty or null response payload emitted by workflow."],
        sanitized: false
      };
    }

    const jsonStr = JSON.stringify(result);

    // 1. Secret Isolation Check
    if (
      jsonStr.includes("OX_ALPHA_API_KEY") ||
      jsonStr.includes("GEMINI_API_KEY") ||
      jsonStr.includes("PATSNAP_API_KEY") ||
      /sk-[a-zA-Z0-9]{20,}/.test(jsonStr) ||
      /Bearer\s+[a-zA-Z0-9._-]{20,}/.test(jsonStr)
    ) {
      reasons.push("Sensitive secret or authorization token detected in response payload.");
    }

    // 2. Stack Trace / Internal Error Leakage Check
    if (
      jsonStr.includes("at async ") ||
      jsonStr.includes("node:internal") ||
      jsonStr.includes("ConnectTimeoutError")
    ) {
      reasons.push("Raw internal stack trace detected in response content.");
    }

    // 3. Response Content Presence Check
    const mainText =
      result.studyResponse.quick_answer ||
      result.studyResponse.easy_explanation ||
      result.studyResponse.normal_solution ||
      "";

    if (!mainText || mainText.trim().length === 0) {
      reasons.push("Response body contains no usable explanation text.");
    }

    // 4. Payload Size Check (max 5MB)
    if (jsonStr.length > 5 * 1024 * 1024) {
      reasons.push("Payload size exceeds maximum allowable response threshold (5MB).");
    }

    return {
      passed: reasons.length === 0,
      reasons,
      sanitized: false
    };
  }
}

export const quickSolvQualityGate = new QuickSolvQualityGate();
