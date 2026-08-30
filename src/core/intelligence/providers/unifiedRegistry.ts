import { QuickSolvAIRequest, QuickSolvAIResponse, QuickSolvAIProviderAdapter } from "./types";
import { aiProviderRegistry } from "@/services/ai/providers/registry";
import { quickSolvModelCatalog } from "./modelCatalog";

export class UnifiedProviderRegistry {
  private adapters: Map<string, QuickSolvAIProviderAdapter> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // OxAlpha Adapter Facade
    this.registerAdapter({
      id: "oxalpha",
      name: "OxAlpha GPT-4o Gateway Adapter",
      supportedModels: ["ox-alpha/gpt-4o", "openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],
      supportedCapabilities: ["GENERAL_CHAT", "MATH", "CODING", "RESEARCH", "STUDY", "VISION", "CREATIVE"],
      generate: async (req: QuickSolvAIRequest): Promise<QuickSolvAIResponse> => {
        const startTime = performance.now();
        const studyResponse = await aiProviderRegistry.getProvider("oxalpha")!.generate({
          prompt: req.prompt,
          mode: req.mode || "all-in-one",
          modelOverride: req.modelOverride || "auto",
          userName: req.userName,
          history: req.history,
          image: req.image,
          pdf: req.pdf,
          userOpenRouterKey: req.userOpenRouterKey
        });

        return {
          studyResponse,
          text: studyResponse.quick_answer || studyResponse.easy_explanation || studyResponse.normal_solution || "",
          selectedModel: req.modelOverride || "ox-alpha/gpt-4o",
          selectedProvider: "oxalpha",
          durationMs: Math.round(performance.now() - startTime),
          usage: { credits: req.image ? 2 : 1 }
        };
      }
    });

    // Gemini Adapter Facade
    this.registerAdapter({
      id: "gemini",
      name: "Google Gemini Native Adapter",
      supportedModels: ["google/gemini-2.5-flash", "google/gemini-2.5-pro"],
      supportedCapabilities: ["GENERAL_CHAT", "MATH", "CODING", "RESEARCH", "STUDY", "VISION", "CREATIVE"],
      generate: async (req: QuickSolvAIRequest): Promise<QuickSolvAIResponse> => {
        const startTime = performance.now();
        const studyResponse = await aiProviderRegistry.getProvider("gemini")!.generate({
          prompt: req.prompt,
          mode: req.mode || "all-in-one",
          modelOverride: req.modelOverride || "auto",
          userName: req.userName,
          history: req.history,
          image: req.image,
          pdf: req.pdf,
          userGeminiKey: req.userGeminiKey
        });

        return {
          studyResponse,
          text: studyResponse.quick_answer || studyResponse.easy_explanation || studyResponse.normal_solution || "",
          selectedModel: req.modelOverride || "google/gemini-2.5-flash",
          selectedProvider: "gemini",
          durationMs: Math.round(performance.now() - startTime),
          usage: { credits: req.image ? 2 : 1 }
        };
      }
    });
  }

  registerAdapter(adapter: QuickSolvAIProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id: string): QuickSolvAIProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Executes unified provider generation with single-pass bounded fallback.
   * Ensures loop prevention: Primary -> Secondary -> Exit.
   */
  async executeWithBoundedFallback(request: QuickSolvAIRequest): Promise<QuickSolvAIResponse> {
    const targetModelDescriptor = quickSolvModelCatalog.resolveBestModel(
      request.taskType || "GENERAL_CHAT",
      request.modelOverride
    );

    const primaryProviderId = targetModelDescriptor.providerId;
    const secondaryProviderId = primaryProviderId === "oxalpha" ? "gemini" : "oxalpha";

    // 1. Try Primary Adapter
    const primaryAdapter = this.getAdapter(primaryProviderId);
    if (primaryAdapter) {
      try {
        return await primaryAdapter.generate(request);
      } catch (primaryErr: any) {
        console.warn(`[UnifiedRegistry Warning]: Primary adapter '${primaryProviderId}' failed:`, primaryErr.message || primaryErr);
      }
    }

    // 2. Try Secondary Adapter (Single Bounded Pass)
    const secondaryAdapter = this.getAdapter(secondaryProviderId);
    if (secondaryAdapter) {
      try {
        console.log(`[UnifiedRegistry Action]: Bounded fallback executing via '${secondaryProviderId}'...`);
        return await secondaryAdapter.generate(request);
      } catch (secondaryErr: any) {
        console.error(`[UnifiedRegistry Error]: Secondary adapter '${secondaryProviderId}' failed:`, secondaryErr.message || secondaryErr);
      }
    }

    // 3. Fallback exhaustion error without exposing secrets
    throw new Error("All configured AI providers encountered unexpected errors or missing credentials.");
  }
}

export const unifiedProviderRegistry = new UnifiedProviderRegistry();
