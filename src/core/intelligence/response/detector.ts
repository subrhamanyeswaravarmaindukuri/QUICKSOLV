import { QuickSolvTaskType, QuickSolvRequest } from "../types";
import { classifyQuickSolvRequest } from "../classifier";
import { QuickSolvResponseMode, QuickSolvIntentDepth } from "./types";

export class QuickSolvResponseDetector {
  /**
   * Analyzes prompt, options, and attachments deterministically to detect Response Mode & Intent Depth.
   */
  detectIntentDepth(request: QuickSolvRequest): QuickSolvIntentDepth {
    const taskType: QuickSolvTaskType =
      request.taskType || classifyQuickSolvRequest(request.prompt, request);

    const promptLower = request.prompt.toLowerCase().trim();
    const hasImage = !!request.image;
    const hasPdf = !!request.pdf;
    const hasHistory = Array.isArray(request.history) && request.history.length > 0;

    let responseMode: QuickSolvResponseMode = "DIRECT_ANSWER";

    if (hasImage) {
      responseMode = "VISION_ANALYSIS";
    } else if (hasPdf) {
      responseMode = "DOCUMENT_ANALYSIS";
    } else if (promptLower.includes("debug") || promptLower.includes("fix error") || promptLower.includes("bug")) {
      responseMode = "DEBUGGING";
    } else if (promptLower.includes("tutorial") || promptLower.includes("for beginner") || promptLower.includes("how to learn")) {
      responseMode = "TUTORIAL";
    } else if (promptLower.includes("compare") || promptLower.includes("vs") || promptLower.includes("difference between")) {
      responseMode = "COMPARISON";
    } else if (promptLower.includes("summary") || promptLower.includes("summarize") || promptLower.includes("tldr")) {
      responseMode = "SUMMARY";
    } else if (promptLower.includes("brainstorm") || promptLower.includes("ideas for")) {
      responseMode = "BRAINSTORM";
    } else if (promptLower.includes("action plan") || promptLower.includes("roadmap") || promptLower.includes("steps to")) {
      responseMode = "ACTION_PLAN";
    } else if (promptLower.includes("exam") || promptLower.includes("test prep") || promptLower.includes("quiz prep")) {
      responseMode = "EXAM_MODE";
    } else if (taskType === "MATH") {
      responseMode = "STEP_BY_STEP";
    } else if (taskType === "CODING") {
      responseMode = "CODE_SOLUTION";
    } else if (taskType === "STUDY") {
      responseMode = "STUDY_MODE";
    } else if (taskType === "RESEARCH") {
      responseMode = "RESEARCH_MODE";
    } else if (taskType === "CREATIVE") {
      responseMode = "CREATIVE";
    } else if (promptLower.includes("in detail") || promptLower.includes("explain deeply") || promptLower.includes("comprehensive")) {
      responseMode = "DEEP_EXPLANATION";
    }

    // Determine verbosity
    let verbosityLevel: "concise" | "normal" | "detailed" = "normal";
    if (promptLower.includes("brief") || promptLower.includes("short") || promptLower.includes("quick")) {
      verbosityLevel = "concise";
    } else if (
      promptLower.includes("detailed") ||
      promptLower.includes("deep") ||
      promptLower.includes("thorough") ||
      responseMode === "TUTORIAL" ||
      responseMode === "DEEP_EXPLANATION"
    ) {
      verbosityLevel = "detailed";
    }

    // Determine tool & verification requirements
    const requiresTools = taskType === "MATH" || taskType === "RESEARCH";
    const requiresStructuredOutput = taskType === "STUDY" || taskType === "CODING" || responseMode === "COMPARISON";
    const requiresVerification = taskType === "MATH";

    return {
      taskType,
      responseMode,
      requiresTools,
      requiresStructuredOutput,
      requiresVerification,
      requiresContext: hasHistory,
      verbosityLevel
    };
  }
}

export const quickSolvResponseDetector = new QuickSolvResponseDetector();
