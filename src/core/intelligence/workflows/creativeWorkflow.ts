import { QuickSolvWorkflow, QuickSolvWorkflowResult, QuickSolvReasoningStrategy } from "./types";
import { QuickSolvTaskType, QuickSolvRequest } from "../types";
import { QuickSolvToolPermission } from "../tools/types";
import { unifiedProviderRegistry } from "../providers/unifiedRegistry";

export class CreativeWorkflow implements QuickSolvWorkflow {
  readonly taskType: QuickSolvTaskType = "CREATIVE";
  readonly strategy: QuickSolvReasoningStrategy = "DIRECT";

  async execute(
    request: QuickSolvRequest,
    _userPermission: QuickSolvToolPermission = "public-safe"
  ): Promise<QuickSolvWorkflowResult> {
    const formattedPrompt = `${request.prompt}\n(Creative Style Instructions: Adopt an engaging, creative, and clear tone while focusing on original storytelling or brainstorming.)`;

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

export const creativeWorkflow = new CreativeWorkflow();
