import { QuickSolvRequest, QuickSolvResponse, QuickSolvTaskType, QuickSolvToolExecutionRecord } from "./types";
import { classifyQuickSolvRequest } from "./classifier";
import { quickSolvToolRegistry } from "./tools/registry";
import { QuickSolvToolPermission } from "./tools/types";
import { unifiedProviderRegistry } from "./providers/unifiedRegistry";

export class QuickSolvIntelligenceRouter {
  /**
   * Processes a QuickSolv 1.0 Intelligence Layer request.
   * 1. Classifies task type if not specified.
   * 2. Executes required pre-pass tools safely with permission checks & timeouts.
   * 3. Delegates core generation to UnifiedProviderRegistry with bounded fallback.
   * 4. Wraps and returns normalized QuickSolvResponse.
   */
  async processRequest(
    request: QuickSolvRequest,
    userPermission: QuickSolvToolPermission = "public-safe"
  ): Promise<QuickSolvResponse> {
    // 1. Task Classification
    const taskType: QuickSolvTaskType =
      request.taskType ||
      classifyQuickSolvRequest(request.prompt, {
        image: request.image,
        pdf: request.pdf,
        mode: request.mode
      });

    const toolsExecuted: QuickSolvToolExecutionRecord[] = [];
    let effectivePrompt = request.prompt;

    // 2. Pre-pass Tool Execution for MATH
    if (taskType === "MATH" && /\d+[\s+\-*/^]+\d+/.test(request.prompt)) {
      const calcResult = await quickSolvToolRegistry.executeTool(
        "tool_calculator",
        { expression: request.prompt },
        userPermission
      );

      toolsExecuted.push({
        toolId: calcResult.toolId,
        toolName: calcResult.toolName,
        input: { expression: request.prompt },
        output: calcResult.data || { error: calcResult.error },
        success: calcResult.success,
        durationMs: calcResult.durationMs
      });

      if (calcResult.success && calcResult.data?.result) {
        effectivePrompt = `${request.prompt}\n[MathJS Verified Result]: ${calcResult.data.result}`;
      }
    }

    // 3. Pre-pass Tool Execution for RESEARCH with Patent keywords
    if (
      taskType === "RESEARCH" &&
      ["patent", "prior art", "assignee"].some(k => request.prompt.toLowerCase().includes(k))
    ) {
      const patentResult = await quickSolvToolRegistry.executeTool(
        "tool_patent_search",
        { query: request.prompt },
        userPermission === "public-safe" ? "authenticated" : userPermission
      );

      toolsExecuted.push({
        toolId: patentResult.toolId,
        toolName: patentResult.toolName,
        input: { query: request.prompt },
        output: patentResult.data || { error: patentResult.error },
        success: patentResult.success,
        durationMs: patentResult.durationMs
      });

      if (
        patentResult.success &&
        patentResult.data &&
        Array.isArray(patentResult.data.results) &&
        patentResult.data.results.length > 0
      ) {
        const patentSummary = patentResult.data.results
          .map((p: any) => `• Patent: ${p.title} (${p.patentNo}) - Assignee: ${p.assignees?.join(", ") || "N/A"}`)
          .join("\n");
        effectivePrompt = `${request.prompt}\n[Patsnap Findings]:\n${patentSummary}`;
      }
    }

    // 4. Unified Provider Execution with Bounded Fallback
    const providerResponse = await unifiedProviderRegistry.executeWithBoundedFallback({
      prompt: effectivePrompt,
      taskType,
      mode: request.mode || "all-in-one",
      modelOverride: request.modelOverride || "auto",
      userName: request.userName,
      history: request.history,
      image: request.image,
      pdf: request.pdf,
      userGeminiKey: request.userGeminiKey,
      userOpenRouterKey: request.userOpenRouterKey
    });

    return {
      studyResponse: providerResponse.studyResponse,
      taskType,
      selectedModel: providerResponse.selectedModel,
      selectedProvider: providerResponse.selectedProvider,
      toolsExecuted,
      usage: providerResponse.usage
    };
  }
}

export const quickSolvIntelligenceRouter = new QuickSolvIntelligenceRouter();
