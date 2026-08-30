import { QuickSolvRequest, QuickSolvResponse, QuickSolvTaskType, QuickSolvToolExecutionRecord } from "./types";
import { classifyQuickSolvRequest } from "./classifier";
import { aiProviderRegistry } from "@/services/ai/providers/registry";
import { GeminiStudyResponse } from "@/services/ai/gemini";
import { quickSolvToolRegistry } from "./tools/registry";

export class QuickSolvIntelligenceRouter {
  /**
   * Processes a QuickSolv 1.0 Intelligence Layer request.
   * 1. Classifies task type if not specified.
   * 2. Resolves target model engine via Provider Registry.
   * 3. Executes required pre-pass tools (e.g. calculator for MATH, patent search for RESEARCH).
   * 4. Delegates core generation to AIProviderRegistry with automated fallback.
   * 5. Wraps and returns normalized QuickSolvResponse.
   */
  async processRequest(request: QuickSolvRequest): Promise<QuickSolvResponse> {
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
      const calcResult = await quickSolvToolRegistry.executeTool("tool_calculator", {
        expression: request.prompt
      });
      toolsExecuted.push(calcResult);
      if (calcResult.success && calcResult.output?.formattedText) {
        effectivePrompt = `${request.prompt}\n[MathJS Verified Pre-Calculation]: ${calcResult.output.formattedText}`;
      }
    }

    // 3. Pre-pass Tool Execution for RESEARCH with Patent keywords
    if (taskType === "RESEARCH" && ["patent", "prior art", "assignee"].some(k => request.prompt.toLowerCase().includes(k))) {
      const patentResult = await quickSolvToolRegistry.executeTool("tool_patent_search", {
        query: request.prompt
      });
      toolsExecuted.push(patentResult);
      if (patentResult.success && Array.isArray(patentResult.output?.results) && patentResult.output.results.length > 0) {
        const patentSummary = patentResult.output.results
          .map((p: any) => `• Patent: ${p.title} (${p.patentNo}) - Assignee: ${p.assignees?.join(", ") || "N/A"}`)
          .join("\n");
        effectivePrompt = `${request.prompt}\n[Patsnap Findings]:\n${patentSummary}`;
      }
    }

    // 4. Resolve Target Provider & Execute via Registry
    const targetModel = request.modelOverride || "auto";
    const resolvedProviderId = aiProviderRegistry.resolveProviderId(targetModel);

    const studyResponse: GeminiStudyResponse = await aiProviderRegistry.executeWithFallback({
      prompt: effectivePrompt,
      mode: request.mode || "all-in-one",
      modelOverride: targetModel,
      userName: request.userName,
      history: request.history,
      image: request.image,
      pdf: request.pdf,
      userGeminiKey: request.userGeminiKey,
      userOpenRouterKey: request.userOpenRouterKey
    });

    const creditsCost = request.image ? 2 : 1;

    return {
      studyResponse,
      taskType,
      selectedModel: targetModel === "auto" ? "ox-alpha/gpt-4o" : targetModel,
      selectedProvider: resolvedProviderId,
      toolsExecuted,
      usage: {
        credits: creditsCost
      }
    };
  }
}

export const quickSolvIntelligenceRouter = new QuickSolvIntelligenceRouter();
