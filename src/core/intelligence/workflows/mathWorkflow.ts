import { QuickSolvWorkflow, QuickSolvWorkflowResult, QuickSolvReasoningStrategy } from "./types";
import { QuickSolvTaskType, QuickSolvRequest, QuickSolvToolExecutionRecord } from "../types";
import { QuickSolvToolPermission } from "../tools/types";
import { quickSolvToolRegistry } from "../tools/registry";
import { unifiedProviderRegistry } from "../providers/unifiedRegistry";

export class MathWorkflow implements QuickSolvWorkflow {
  readonly taskType: QuickSolvTaskType = "MATH";
  readonly strategy: QuickSolvReasoningStrategy = "TOOL_ASSISTED";

  async execute(
    request: QuickSolvRequest,
    userPermission: QuickSolvToolPermission = "public-safe"
  ): Promise<QuickSolvWorkflowResult> {
    const toolsExecuted: QuickSolvToolExecutionRecord[] = [];
    let effectivePrompt = request.prompt;

    // Check if mathematical expression evaluation is appropriate
    if (/\d+[\s+\-*/^()]+\d+/.test(request.prompt)) {
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
        effectivePrompt = `${request.prompt}\n[MathJS Verified Result]: ${calcResult.data.result}\n(Instructions: Provide a clear, step-by-step mathematical explanation using the verified calculation result above.)`;
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
      reasoningStrategy: toolsExecuted.length > 0 ? "TOOL_ASSISTED" : "STRUCTURED",
      toolsExecuted,
      selectedModel: providerResponse.selectedModel,
      selectedProvider: providerResponse.selectedProvider,
      usage: providerResponse.usage
    };
  }
}

export const mathWorkflow = new MathWorkflow();
