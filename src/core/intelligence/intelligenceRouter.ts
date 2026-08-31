import { QuickSolvRequest, QuickSolvResponse, QuickSolvTaskType } from "./types";
import { classifyQuickSolvRequest } from "./classifier";
import { QuickSolvToolPermission } from "./tools/types";
import { quickSolvWorkflowRegistry } from "./workflows/workflowRegistry";
import { QuickSolvWorkflowResult } from "./workflows/types";

export class QuickSolvIntelligenceRouter {
  /**
   * Processes a QuickSolv 1.0 Intelligence Layer request.
   * 1. Classifies task type if not specified.
   * 2. Selects task-specific workflow from QuickSolvWorkflowRegistry.
   * 3. Executes workflow (Reasoning Strategy -> Tool Selection -> Model Router -> AI Provider).
   * 4. Validates output safety & formats QuickSolvResponse.
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

    // 2. Workflow Selection
    const workflow = quickSolvWorkflowRegistry.getWorkflow(taskType);

    // 3. Workflow Execution
    const result: QuickSolvWorkflowResult = await workflow.execute(request, userPermission);

    // 4. Output Validation & Sanitization
    this.validateWorkflowOutput(result);

    return {
      studyResponse: result.studyResponse,
      taskType,
      selectedModel: result.selectedModel,
      selectedProvider: result.selectedProvider,
      toolsExecuted: result.toolsExecuted,
      usage: result.usage,
      metadata: {
        reasoningStrategy: result.reasoningStrategy,
        ...result.metadata
      }
    };
  }

  /**
   * Validates workflow output to ensure secrets or raw unhandled errors are not leaked.
   */
  private validateWorkflowOutput(result: QuickSolvWorkflowResult): void {
    if (!result || !result.studyResponse) {
      throw new Error("Workflow returned invalid or empty response payload.");
    }

    // Ensure no provider secrets are present in response metadata or study payload
    const rawContent = JSON.stringify(result);
    if (
      rawContent.includes("OX_ALPHA_API_KEY") ||
      rawContent.includes("GEMINI_API_KEY") ||
      rawContent.includes("PATSNAP_API_KEY")
    ) {
      throw new Error("Security Alert: Sensitive configuration detected in response payload.");
    }
  }
}

export const quickSolvIntelligenceRouter = new QuickSolvIntelligenceRouter();
