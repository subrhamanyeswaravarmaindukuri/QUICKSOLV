import { QuickSolvRequest, QuickSolvResponse, QuickSolvTaskType } from "../types";
import { QuickSolvToolPermission } from "../tools/types";
import { quickSolvWorkflowRegistry } from "../workflows/workflowRegistry";
import { quickSolvQualityGate } from "./qualityGate";
import { QuickSolvExecutionContext, QuickSolvMultimodalValidationResult } from "./types";
import { quickSolvResponseDetector } from "../response/detector";
import { quickSolvResponseStrategyManager } from "../response/strategy";
import { quickSolvContextManager } from "../memory/contextManager";
import { quickSolvLogger, quickSolvMetricsCollector, quickSolvHealthMonitor } from "@/core/observability";

export class QuickSolvExecutionEngine {
  private readonly DEFAULT_TIMEOUT_MS = 30000;
  private readonly MAX_PROMPT_LENGTH = 20000;
  private readonly MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  private readonly MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  /**
   * Executes a QuickSolv request through the hardened Step 9 Observability & Execution Engine.
   */
  async execute(
    request: QuickSolvRequest,
    userPermission: QuickSolvToolPermission = "public-safe"
  ): Promise<QuickSolvResponse> {
    quickSolvMetricsCollector.recordRequest();

    const context: QuickSolvExecutionContext = {
      correlationId: this.generateCorrelationId(),
      startTime: performance.now(),
      userPermission
    };

    try {
      // 1. Multimodal & Input Validation
      this.validateMultimodalPayload(request);

      // 2. Model Override Safety Check
      if (request.modelOverride && request.modelOverride !== "auto") {
        this.validateModelOverride(request.modelOverride);
      }

      // 3. Bounded Context & Memory Management (Step 8)
      const memoryResult = quickSolvContextManager.processContext(request.prompt, request.history);
      const boundedRequest = this.applyBoundedContext({
        ...request,
        history: memoryResult.normalizedHistory
      });

      // 4. Intent Depth & Response Mode Detection
      const intentDepth = quickSolvResponseDetector.detectIntentDepth(boundedRequest);
      const strategyReqs = quickSolvResponseStrategyManager.resolveStrategy(intentDepth);

      const taskType: QuickSolvTaskType = intentDepth.taskType;
      context.taskType = taskType;

      // 5. Workflow Resolution
      const workflow = quickSolvWorkflowRegistry.getWorkflow(taskType);

      // 6. Safe Workflow Execution with Timeout Protection (30s)
      const workflowPromise = workflow.execute(boundedRequest, userPermission);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`AI execution timed out after ${this.DEFAULT_TIMEOUT_MS}ms`)),
          this.DEFAULT_TIMEOUT_MS
        )
      );

      const workflowResult = await Promise.race([workflowPromise, timeoutPromise]);

      context.selectedModel = workflowResult.selectedModel;
      context.selectedProvider = workflowResult.selectedProvider;

      // Track Provider Health Success
      if (workflowResult.selectedProvider === "oxalpha" || workflowResult.selectedProvider === "gemini") {
        quickSolvHealthMonitor.recordProviderSuccess(workflowResult.selectedProvider);
      }

      // 7. Response Quality Gate & Completeness Validation
      const qualityCheck = quickSolvQualityGate.validatePayload(workflowResult, strategyReqs);
      if (!qualityCheck.passed) {
        throw new Error(`Quality Gate Failure: ${qualityCheck.reasons.join("; ")}`);
      }

      context.latencyMs = Math.round(performance.now() - context.startTime);
      context.success = true;

      // Record Metrics
      quickSolvMetricsCollector.recordSuccess();
      quickSolvMetricsCollector.recordLatency(context.latencyMs);

      // Safe Internal Structured Logging
      quickSolvLogger.info("ExecutionEngine successfully processed request", {
        correlationId: context.correlationId,
        taskType,
        selectedModel: workflowResult.selectedModel,
        selectedProvider: workflowResult.selectedProvider,
        latencyMs: context.latencyMs,
        success: true
      });

      return {
        studyResponse: workflowResult.studyResponse,
        taskType,
        selectedModel: workflowResult.selectedModel,
        selectedProvider: workflowResult.selectedProvider,
        toolsExecuted: workflowResult.toolsExecuted,
        usage: workflowResult.usage,
        metadata: {
          correlationId: context.correlationId,
          responseMode: intentDepth.responseMode,
          verbosityLevel: intentDepth.verbosityLevel,
          requiresTools: intentDepth.requiresTools,
          truncatedContextCount: memoryResult.selectionInfo.truncatedCount,
          reasoningStrategy: workflowResult.reasoningStrategy,
          qualityGatePassed: true,
          latencyMs: context.latencyMs,
          ...workflowResult.metadata
        }
      };
    } catch (err: any) {
      context.latencyMs = Math.round(performance.now() - context.startTime);
      context.success = false;
      context.failureCategory = this.categorizeError(err);

      // Record Metrics & Provider Failure
      quickSolvMetricsCollector.recordFailure(context.failureCategory);
      if (context.selectedProvider === "oxalpha" || context.selectedProvider === "gemini") {
        quickSolvHealthMonitor.recordProviderFailure(context.selectedProvider, err?.message);
      }

      quickSolvLogger.error(`ExecutionEngine request failed: ${err?.message}`, {
        correlationId: context.correlationId,
        taskType: context.taskType,
        selectedProvider: context.selectedProvider,
        latencyMs: context.latencyMs,
        success: false,
        failureCategory: context.failureCategory
      });

      throw this.sanitizeError(err);
    }
  }

  private generateCorrelationId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000).toString(36);
    return `qs_req_${timestamp}_${random}`;
  }

  private validateMultimodalPayload(request: QuickSolvRequest): QuickSolvMultimodalValidationResult {
    if (request.image) {
      const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validMimes.includes(request.image.mimeType)) {
        throw new Error(`Unsupported image format '${request.image.mimeType}'. Supported: ${validMimes.join(", ")}`);
      }
      if (request.image.data && request.image.data.length > this.MAX_IMAGE_SIZE_BYTES * 1.35) {
        throw new Error("Image payload size exceeds maximum threshold (10MB).");
      }
    }

    if (request.pdf) {
      if (request.pdf.mimeType !== "application/pdf") {
        throw new Error(`Unsupported document format '${request.pdf.mimeType}'. Only PDF is supported.`);
      }
      if (request.pdf.data && request.pdf.data.length > this.MAX_PDF_SIZE_BYTES * 1.35) {
        throw new Error("Document payload size exceeds maximum threshold (10MB).");
      }
    }

    return { valid: true };
  }

  private validateModelOverride(modelOverride: string): void {
    const safeModelSlugs = [
      "auto",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro",
      "meta-llama/llama-3.3-70b-instruct",
      "ox-alpha/gpt-4o"
    ];

    if (!safeModelSlugs.includes(modelOverride)) {
      quickSolvLogger.warn(`Unregistered model override '${modelOverride}' supplied. Defaulting to safe catalog model.`);
    }
  }

  private applyBoundedContext(request: QuickSolvRequest): QuickSolvRequest {
    let boundedPrompt = request.prompt;
    if (boundedPrompt.length > this.MAX_PROMPT_LENGTH) {
      boundedPrompt = boundedPrompt.slice(0, this.MAX_PROMPT_LENGTH) + "\n[Context truncated due to length limits]";
    }

    return {
      ...request,
      prompt: boundedPrompt
    };
  }

  private categorizeError(err: any): string {
    const msg = String(err.message || err);
    if (msg.includes("timed out")) return "TIMEOUT";
    if (msg.includes("401") || msg.includes("Authentication")) return "AUTH_ERROR";
    if (msg.includes("403") || msg.includes("Permission")) return "PERMISSION_ERROR";
    if (msg.includes("404") || msg.includes("not found")) return "NOT_FOUND";
    if (msg.includes("429") || msg.includes("rate limit")) return "RATE_LIMIT";
    if (msg.includes("Quality Gate")) return "QUALITY_GATE_FAILURE";
    return "PROVIDER_ERROR";
  }

  private sanitizeError(err: any): Error {
    const origMsg = String(err.message || err);
    let sanitizedMsg = origMsg
      .replace(/OX_ALPHA_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
      .replace(/GEMINI_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
      .replace(/PATSNAP_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
      .replace(/Bearer\s+[^\s]+/g, "Bearer [REDACTED_TOKEN]");

    return new Error(sanitizedMsg);
  }
}

export const quickSolvExecutionEngine = new QuickSolvExecutionEngine();
