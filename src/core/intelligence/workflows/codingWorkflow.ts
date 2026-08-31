import { QuickSolvWorkflow, QuickSolvWorkflowResult, QuickSolvReasoningStrategy } from "./types";
import { QuickSolvTaskType, QuickSolvRequest } from "../types";
import { QuickSolvToolPermission } from "../tools/types";
import { unifiedProviderRegistry } from "../providers/unifiedRegistry";

export class CodingWorkflow implements QuickSolvWorkflow {
  readonly taskType: QuickSolvTaskType = "CODING";
  readonly strategy: QuickSolvReasoningStrategy = "STRUCTURED";

  async execute(
    request: QuickSolvRequest,
    _userPermission: QuickSolvToolPermission = "public-safe"
  ): Promise<QuickSolvWorkflowResult> {
    const formattedPrompt = `${request.prompt}\n(Coding Workflow Guidelines: 1. Understand Problem & Requirements. 2. Outline Approach. 3. Provide Clean, Production-Grade Code Solution with Inline Comments. 4. Highlight Potential Edge Cases.)`;

    const providerResponse = await unifiedProviderRegistry.executeWithBoundedFallback({
      prompt: formattedPrompt,
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
      reasoningStrategy: this.strategy,
      toolsExecuted: [],
      selectedModel: providerResponse.selectedModel,
      selectedProvider: providerResponse.selectedProvider,
      usage: providerResponse.usage
    };
  }
}

export const codingWorkflow = new CodingWorkflow();
