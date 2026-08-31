import { QuickSolvIntentDepth, QuickSolvResponseStrategyRequirements } from "./types";

export class QuickSolvResponseStrategyManager {
  /**
   * Resolves execution requirements & output constraints based on Intent Depth.
   */
  resolveStrategy(intentDepth: QuickSolvIntentDepth): QuickSolvResponseStrategyRequirements {
    let minContentLength = 10;
    if (intentDepth.verbosityLevel === "detailed") {
      minContentLength = 50;
    } else if (intentDepth.verbosityLevel === "concise") {
      minContentLength = 5;
    }

    const requiredSections: string[] = [];

    switch (intentDepth.responseMode) {
      case "STEP_BY_STEP":
        requiredSections.push("steps");
        break;
      case "CODE_SOLUTION":
        requiredSections.push("code", "explanation");
        break;
      case "DEBUGGING":
        requiredSections.push("issue", "fix");
        break;
      case "STUDY_MODE":
      case "EXAM_MODE":
        requiredSections.push("concept", "solution");
        break;
      case "RESEARCH_MODE":
        requiredSections.push("findings");
        break;
      case "COMPARISON":
        requiredSections.push("comparison");
        break;
      default:
        break;
    }

    return {
      intentDepth,
      requiredSections,
      minContentLength
    };
  }
}

export const quickSolvResponseStrategyManager = new QuickSolvResponseStrategyManager();
