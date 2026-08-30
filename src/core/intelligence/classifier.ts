import { QuickSolvTaskType } from "./types";
import { classifyIntent } from "@/services/ai/intent";

/**
 * Lightweight deterministic request classifier for QuickSolv 1.0.
 * Classifies input prompt and optional media attachments into a QuickSolvTaskType.
 */
export function classifyQuickSolvRequest(
  prompt: string,
  options?: { image?: any; pdf?: any; mode?: string }
): QuickSolvTaskType {
  if (options?.image) {
    return "VISION";
  }

  if (options?.pdf) {
    return "DOCUMENT";
  }

  const pLower = prompt.toLowerCase().trim();

  // Detect Image Generation requests
  if (
    pLower.includes("generate an image") ||
    pLower.includes("create an image") ||
    pLower.includes("draw an image") ||
    pLower.includes("text to image") ||
    pLower.includes("image generation")
  ) {
    return "IMAGE_GENERATION";
  }

  // Use existing intent classifier for signal mapping
  const intent = classifyIntent(prompt, !!options?.image, !!options?.pdf);

  switch (intent) {
    case "CODE":
    case "DEBUG":
      return "CODING";
    case "SOLVE":
    case "CALCULATE":
      return "MATH";
    case "RESEARCH":
      return "RESEARCH";
    case "LEARN":
    case "STUDY":
    case "EXPLAIN":
      return "STUDY";
    case "CREATE":
    case "SUMMARIZE":
      return "CREATIVE";
    case "IMAGE_ANALYSIS":
      return "VISION";
    case "DOCUMENT_ANALYSIS":
      return "DOCUMENT";
    default:
      return "GENERAL_CHAT";
  }
}
