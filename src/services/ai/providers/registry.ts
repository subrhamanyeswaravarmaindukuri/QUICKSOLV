import { AIProviderAdapter, ProviderHealthStatus } from "./types";
import { geminiProviderAdapter } from "./geminiProvider";
import { oxalphaProviderAdapter } from "./oxalphaProvider";
import { patsnapProviderAdapter } from "./patsnapProvider";
import { GeminiStudyResponse } from "../gemini";
import { RouterOptions } from "../router";

export class AIProviderRegistry {
  private providers: Map<string, AIProviderAdapter> = new Map();

  constructor() {
    this.registerProvider(oxalphaProviderAdapter);
    this.registerProvider(geminiProviderAdapter);
  }

  registerProvider(adapter: AIProviderAdapter): void {
    this.providers.set(adapter.id, adapter);
  }

  getProvider(id: string): AIProviderAdapter | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): AIProviderAdapter[] {
    return Array.from(this.providers.values());
  }

  /**
   * Resolves target provider based on requested model or "auto" selection.
   */
  resolveProviderId(modelOverride?: string): string {
    if (!modelOverride || modelOverride === "auto" || modelOverride === "ox-alpha") {
      return "oxalpha";
    }

    const lowerModel = modelOverride.toLowerCase();
    if (
      lowerModel.includes("gemini") ||
      lowerModel.includes("google")
    ) {
      return "gemini";
    }

    if (
      lowerModel.includes("gpt") ||
      lowerModel.includes("claude") ||
      lowerModel.includes("llama") ||
      lowerModel.includes("openai") ||
      lowerModel.includes("anthropic") ||
      lowerModel.includes("meta-llama")
    ) {
      return "oxalpha";
    }

    return "oxalpha";
  }

  /**
   * Executes AI generation using target provider adapter with automatic secondary fallback.
   */
  async executeWithFallback(options: RouterOptions): Promise<GeminiStudyResponse> {
    const primaryId = this.resolveProviderId(options.modelOverride);
    const secondaryId = primaryId === "oxalpha" ? "gemini" : "oxalpha";

    const primaryAdapter = this.getProvider(primaryId);
    const secondaryAdapter = this.getProvider(secondaryId);

    let lastError: any = null;

    // 1. Try primary provider adapter if available
    if (primaryAdapter && primaryAdapter.getHealthStatus(options) !== "CONFIGURATION_MISSING") {
      try {
        return await primaryAdapter.generate(options);
      } catch (err: any) {
        console.warn(`[AI Registry Warning]: Primary provider '${primaryId}' failed:`, err.message || err);
        lastError = err;
      }
    } else {
      console.warn(`[AI Registry Notice]: Primary provider '${primaryId}' configuration missing or unavailable.`);
    }

    // 2. Fallback to secondary provider adapter
    if (secondaryAdapter && secondaryAdapter.getHealthStatus(options) !== "CONFIGURATION_MISSING") {
      try {
        console.log(`[AI Registry Action]: Executing fallback route via secondary provider '${secondaryId}'...`);
        return await secondaryAdapter.generate(options);
      } catch (fallbackErr: any) {
        console.error(`[AI Registry Error]: Secondary fallback provider '${secondaryId}' also failed:`, fallbackErr.message || fallbackErr);
        lastError = fallbackErr;
      }
    }

    // 3. If both providers fail or missing configuration, throw sanitized error
    throw lastError || new Error("All configured AI providers encountered unexpected errors or missing credentials.");
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
