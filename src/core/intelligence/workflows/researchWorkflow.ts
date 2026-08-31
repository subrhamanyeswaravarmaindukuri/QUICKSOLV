import { QuickSolvWorkflow, QuickSolvWorkflowResult, QuickSolvReasoningStrategy } from "./types";
import { QuickSolvTaskType, QuickSolvRequest, QuickSolvToolExecutionRecord } from "../types";
import { QuickSolvToolPermission } from "../tools/types";
import { quickSolvToolRegistry } from "../tools/registry";
import { unifiedProviderRegistry } from "../providers/unifiedRegistry";

export class ResearchWorkflow implements QuickSolvWorkflow {
  readonly taskType: QuickSolvTaskType = "RESEARCH";
  readonly strategy: QuickSolvReasoningStrategy = "RESEARCH_ASSISTED";

  async execute(
    request: QuickSolvRequest,
    userPermission: QuickSolvToolPermission = "public-safe"
  ): Promise<QuickSolvWorkflowResult> {
    const toolsExecuted: QuickSolvToolExecutionRecord[] = [];
    let effectivePrompt = request.prompt;

    // Check if patent / prior art research is requested
    if (["patent", "prior art", "assignee", "patentability"].some(k => request.prompt.toLowerCase().includes(k))) {
      const patentPermission = userPermission === "public-safe" ? "authenticated" : userPermission;
      const patentResult = await quickSolvToolRegistry.executeTool(
        "tool_patent_search",
        { query: request.prompt },
        patentPermission
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
        effectivePrompt = `${request.prompt}\n[Patsnap Verified Research Findings]:\n${patentSummary}`;
      }
    }

    const providerResponse = await unifiedProviderRegistry.executeWithBoundedFallback({
      prompt: effectivePrompt,
      taskType: this.taskType,
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
      reasoningStrategy: toolsExecuted.length > 0 ? "RESEARCH_ASSISTED" : "STRUCTURED",
      toolsExecuted,
      selectedModel: providerResponse.selectedModel,
      selectedProvider: providerResponse.selectedProvider,
      usage: providerResponse.usage
    };
  }
}

export const researchWorkflow = new ResearchWorkflow();
