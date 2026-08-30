import { QuickSolvTaskType } from "../types";

export interface ModelDescriptor {
  modelId: string;
  providerId: string;
  displayName: string;
  supportedCapabilities: QuickSolvTaskType[];
  supportsVision: boolean;
  priority: number;
}

export class QuickSolvModelCatalog {
  private models: ModelDescriptor[] = [
    {
      modelId: "ox-alpha/gpt-4o",
      providerId: "oxalpha",
      displayName: "OxAlpha GPT-4o Engine",
      supportedCapabilities: ["GENERAL_CHAT", "MATH", "CODING", "RESEARCH", "STUDY", "VISION", "CREATIVE"],
      supportsVision: true,
      priority: 1
    },
    {
      modelId: "openai/gpt-4o",
      providerId: "oxalpha",
      displayName: "OpenAI GPT-4o",
      supportedCapabilities: ["GENERAL_CHAT", "MATH", "CODING", "RESEARCH", "STUDY", "VISION", "CREATIVE"],
      supportsVision: true,
      priority: 2
    },
    {
      modelId: "google/gemini-2.5-flash",
      providerId: "gemini",
      displayName: "Google Gemini 2.5 Flash",
      supportedCapabilities: ["GENERAL_CHAT", "MATH", "CODING", "RESEARCH", "STUDY", "VISION", "CREATIVE"],
      supportsVision: true,
      priority: 3
    },
    {
      modelId: "google/gemini-2.5-pro",
      providerId: "gemini",
      displayName: "Google Gemini 2.5 Pro",
      supportedCapabilities: ["GENERAL_CHAT", "MATH", "CODING", "RESEARCH", "STUDY", "VISION", "CREATIVE"],
      supportsVision: true,
      priority: 4
    }
  ];

  getModel(modelId: string): ModelDescriptor | undefined {
    return this.models.find(m => m.modelId.toLowerCase() === modelId.toLowerCase());
  }

  getModelsForCapability(capability: QuickSolvTaskType): ModelDescriptor[] {
    return this.models
      .filter(m => m.supportedCapabilities.includes(capability))
      .sort((a, b) => a.priority - b.priority);
  }

  resolveBestModel(capability: QuickSolvTaskType, modelOverride?: string): ModelDescriptor {
    if (modelOverride && modelOverride !== "auto") {
      const matched = this.getModel(modelOverride);
      if (matched) return matched;
    }

    const available = this.getModelsForCapability(capability);
    return available[0] || this.models[0];
  }
}

export const quickSolvModelCatalog = new QuickSolvModelCatalog();
