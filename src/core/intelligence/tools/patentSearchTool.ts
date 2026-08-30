import { QuickSolvTool } from "./types";
import { searchPatsnap, PatentResult } from "@/services/ai/patsnap";

export interface PatentSearchInput {
  query: string;
}

export interface PatentSearchOutput {
  success: boolean;
  results: PatentResult[];
  configError?: boolean;
  error?: string;
}

export class PatentSearchTool implements QuickSolvTool<PatentSearchInput, PatentSearchOutput> {
  id = "tool_patent_search";
  name = "Patsnap Eureka Patent Connector";
  description = "Searches global R&D patent databases for prior art, patent title, assignees, and abstracts.";
  timeoutMs = 10000;

  async execute(input: PatentSearchInput): Promise<PatentSearchOutput> {
    if (!input || !input.query || typeof input.query !== "string") {
      return { success: false, results: [], error: "Query parameter must be a non-empty string." };
    }

    try {
      const res = await searchPatsnap(input.query);
      return {
        success: res.success,
        results: res.results || [],
        configError: res.configError
      };
    } catch (err: any) {
      return {
        success: false,
        results: [],
        error: err.message || "Patent search tool failed."
      };
    }
  }
}

export const patentSearchTool = new PatentSearchTool();
