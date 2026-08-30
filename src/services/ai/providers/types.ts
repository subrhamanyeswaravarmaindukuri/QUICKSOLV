import { GeminiStudyResponse } from "../gemini";
import { RouterOptions } from "../router";

export type ProviderHealthStatus =
  | "AVAILABLE"
  | "TEMPORARILY_FAILED"
  | "RATE_LIMITED"
  | "CONFIGURATION_MISSING";

export interface NormalizedAIResponse {
  studyResponse: GeminiStudyResponse;
  model: string;
  provider: string;
  usage: {
    credits: number;
  };
  verification?: {
    verified: boolean;
    engine?: string;
  };
  metadata?: Record<string, any>;
}

export interface AIProviderAdapter {
  id: string;
  name: string;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  getHealthStatus(options?: RouterOptions): ProviderHealthStatus;
  generate(options: RouterOptions): Promise<GeminiStudyResponse>;
}
