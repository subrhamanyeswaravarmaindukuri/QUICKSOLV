import { AIProviderAdapter, ProviderHealthStatus } from "./types";
import { generateOxAlphaContent } from "../oxalpha";
import { GeminiStudyResponse } from "../gemini";
import { RouterOptions } from "../router";

export class OxAlphaProviderAdapter implements AIProviderAdapter {
  id = "oxalpha";
  name = "OxAlpha / OpenRouter AI Engine";
  supportsVision = true;
  supportsStructuredOutput = true;

  getHealthStatus(options?: RouterOptions): ProviderHealthStatus {
    const apiKey =
      options?.userOpenRouterKey ||
      process.env.OX_ALPHA_API_KEY ||
      process.env.OPENROUTER_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return "CONFIGURATION_MISSING";
    }
    return "AVAILABLE";
  }

  async generate(options: RouterOptions): Promise<GeminiStudyResponse> {
    const targetModel = options.modelOverride || "ox-alpha";
    const apiKey =
      options.userOpenRouterKey ||
      process.env.OX_ALPHA_API_KEY ||
      process.env.OPENROUTER_API_KEY;

    return await generateOxAlphaContent({
      prompt: options.prompt,
      mode: options.mode,
      modelOverride: targetModel,
      apiKey,
      userName: options.userName,
      history: options.history,
      image: options.image,
      pdf: options.pdf
    });
  }
}

export const oxalphaProviderAdapter = new OxAlphaProviderAdapter();
