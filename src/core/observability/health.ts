import { ProviderHealthState, HealthCheckResult } from "./types";
import { supabase } from "@/services/supabase";

export class QuickSolvHealthMonitor {
  private providers: Record<"oxalpha" | "gemini", ProviderHealthState> = {
    oxalpha: { status: "healthy", consecutiveFailures: 0 },
    gemini: { status: "healthy", consecutiveFailures: 0 }
  };

  recordProviderSuccess(provider: "oxalpha" | "gemini"): void {
    this.providers[provider] = {
      status: "healthy",
      consecutiveFailures: 0,
      lastSuccess: new Date().toISOString()
    };
  }

  recordProviderFailure(provider: "oxalpha" | "gemini", reason?: string): void {
    const current = this.providers[provider];
    const consecutiveFailures = (current?.consecutiveFailures || 0) + 1;
    const status = consecutiveFailures >= 3 ? "unavailable" : "degraded";

    this.providers[provider] = {
      status,
      consecutiveFailures,
      lastFailure: new Date().toISOString()
    };
  }

  getProviderState(provider: "oxalpha" | "gemini"): ProviderHealthState {
    return this.providers[provider] || { status: "healthy", consecutiveFailures: 0 };
  }

  async checkDatabaseHealth(): Promise<"healthy" | "degraded" | "unhealthy"> {
    if (!supabase) return "healthy";
    try {
      const { error } = await supabase.from("api_keys").select("id").limit(1);
      return error ? "degraded" : "healthy";
    } catch {
      return "degraded";
    }
  }

  async getLivenessStatus(): Promise<HealthCheckResult> {
    const dbStatus = await this.checkDatabaseHealth();
    return {
      status: "healthy",
      version: "1.0",
      timestamp: new Date().toISOString(),
      services: {
        application: "healthy",
        database: dbStatus,
        providers: {
          oxalpha: this.providers.oxalpha.status,
          gemini: this.providers.gemini.status
        }
      }
    };
  }

  async getReadinessStatus(): Promise<{ ready: boolean; details: HealthCheckResult }> {
    const liveness = await this.getLivenessStatus();
    const ready = liveness.services.database !== "unhealthy";
    return {
      ready,
      details: liveness
    };
  }
}

export const quickSolvHealthMonitor = new QuickSolvHealthMonitor();
