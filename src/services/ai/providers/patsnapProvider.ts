import { searchPatsnap, PatentResult } from "../patsnap";
import { ProviderHealthStatus } from "./types";

export class PatsnapProviderAdapter {
  id = "patsnap";
  name = "Patsnap Eureka Patent Connector";

  getHealthStatus(): ProviderHealthStatus {
    const apiKey = process.env.PATSNAP_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return "CONFIGURATION_MISSING";
    }
    return "AVAILABLE";
  }

  async search(query: string): Promise<{ success: boolean; results: PatentResult[]; configError?: boolean }> {
    return await searchPatsnap(query);
  }
}

export const patsnapProviderAdapter = new PatsnapProviderAdapter();
