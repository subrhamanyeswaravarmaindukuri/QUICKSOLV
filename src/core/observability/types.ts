export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type FailureCategory =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "PERMISSION_ERROR"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NOT_FOUND"
  | "PROVIDER_ERROR"
  | "TOOL_ERROR"
  | "QUALITY_GATE_ERROR"
  | "INTERNAL_ERROR";

export interface LogMetadata {
  correlationId?: string;
  taskType?: string;
  responseMode?: string;
  selectedProvider?: string;
  selectedModel?: string;
  latencyMs?: number;
  success?: boolean;
  failureCategory?: FailureCategory | string;
  toolsExecuted?: string[];
  timestamp?: string;
  keyId?: string;
  userId?: string;
  endpoint?: string;
  [key: string]: any;
}

export interface MetricCounters {
  requestCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  rateLimitCount: number;
  authFailureCount: number;
  providerFailureCount: number;
  qualityGateFailureCount: number;
  toolFailureCount: number;
}

export interface ProviderHealthState {
  status: "healthy" | "degraded" | "unavailable";
  consecutiveFailures: number;
  lastFailure?: string;
  lastSuccess?: string;
  avgLatencyMs?: number;
}

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  services: {
    application: "healthy" | "degraded" | "unhealthy";
    database: "healthy" | "degraded" | "unhealthy";
    providers: {
      oxalpha: "healthy" | "degraded" | "unavailable";
      gemini: "healthy" | "degraded" | "unavailable";
    };
  };
}
