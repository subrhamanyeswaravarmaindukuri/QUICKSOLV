import { QuickSolvTool, QuickSolvToolPermission, QuickSolvToolValidationResult } from "./types";
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
  permissions: QuickSolvToolPermission[] = ["authenticated", "developer-api"];
  defaultTimeoutMs = 10000;
  maxOutputSizeBytes = 20000; // 20KB max result payload

  validateInput(input: PatentSearchInput): QuickSolvToolValidationResult {
    if (!input || typeof input !== "object") {
      return { valid: false, error: "Input must be an object containing a 'query' string property." };
    }

    if (typeof input.query !== "string") {
      return { valid: false, error: "Query property must be a string." };
    }

    const trimmed = input.query.trim();
    if (!trimmed) {
      return { valid: false, error: "Query string cannot be empty." };
    }

    if (trimmed.length > 500) {
      return { valid: false, error: "Query exceeds maximum allowed length of 500 characters." };
    }

    return { valid: true, sanitizedInput: { query: trimmed } };
  }

  async execute(input: PatentSearchInput): Promise<PatentSearchOutput> {
    const validation = this.validateInput(input);
    if (!validation.valid) {
      return { success: false, results: [], error: validation.error || "Invalid input." };
    }

    const sanitizedQuery = validation.sanitizedInput.query;

    try {
      const res = await searchPatsnap(sanitizedQuery);
      let resultsList = (res.results || []).slice(0, 10); // Cap at 10 results max

      // Payload size check
      const payloadSize = JSON.stringify(resultsList).length;
      if (payloadSize > this.maxOutputSizeBytes) {
        resultsList = resultsList.slice(0, 3); // Truncate results to fit bound
      }

      return {
        success: res.success,
        results: resultsList,
        configError: res.configError
      };
    } catch (err: any) {
      return {
        success: false,
        results: [],
        error: err.message || "Patent search tool execution failed."
      };
    }
  }
}

export const patentSearchTool = new PatentSearchTool();
