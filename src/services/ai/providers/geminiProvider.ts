import { AIProviderAdapter, ProviderHealthStatus } from "./types";
import { generateGeminiContent, GeminiStudyResponse, GeminiOptions } from "../gemini";
import { RouterOptions } from "../router";

export class GeminiProviderAdapter implements AIProviderAdapter {
  id = "gemini";
  name = "Google Gemini AI Engine";
  supportsVision = true;
  supportsStructuredOutput = true;

  getHealthStatus(options?: RouterOptions): ProviderHealthStatus {
    const apiKey = options?.userGeminiKey || process.env.GEMINI_API_KEY;
    const openRouterKey = options?.userOpenRouterKey || process.env.OPENROUTER_API_KEY;

    if (!apiKey && !openRouterKey) {
      return "CONFIGURATION_MISSING";
    }
    return "AVAILABLE";
  }

  async generate(options: RouterOptions): Promise<GeminiStudyResponse> {
    const geminiOpts: GeminiOptions = {
      prompt: options.prompt,
      mode: options.mode,
      image: options.image,
      pdf: options.pdf,
      modelOverride: options.modelOverride,
      searchGrounding: false,
      userGeminiKey: options.userGeminiKey,
      userOpenRouterKey: options.userOpenRouterKey,
      userName: options.userName,
      history: options.history
    };

    return await generateGeminiContent(geminiOpts);
  }
}

export const geminiProviderAdapter = new GeminiProviderAdapter();
