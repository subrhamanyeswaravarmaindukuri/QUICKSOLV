import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "INVALID_API_KEY"
  | "API_KEY_EXPIRED"
  | "API_KEY_REVOKED"
  | "RATE_LIMIT_EXCEEDED"
  | "QUOTA_EXCEEDED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR";

interface ErrorConfig {
  status: number;
  message: string;
}

const ERROR_MAP: Record<ApiErrorCode, ErrorConfig> = {
  INVALID_API_KEY: { status: 401, message: "The provided API key is invalid or malformed." },
  API_KEY_EXPIRED: { status: 401, message: "The provided API key has expired." },
  API_KEY_REVOKED: { status: 401, message: "The provided API key has been revoked." },
  RATE_LIMIT_EXCEEDED: { status: 429, message: "Rate limit exceeded. Please wait before making additional requests." },
  QUOTA_EXCEEDED: { status: 403, message: "Monthly credit quota exceeded. Please upgrade your plan." },
  UNAUTHORIZED: { status: 401, message: "Authentication is required to access this resource." },
  FORBIDDEN: { status: 403, message: "You do not have permission to access this resource." },
  INVALID_REQUEST: { status: 400, message: "Invalid request payload or parameters." },
  INTERNAL_ERROR: { status: 500, message: "An unexpected server error occurred. Please try again later." }
};

/**
 * Creates a sanitized API error response.
 * Never exposes stack traces, DB credentials, or secrets to the caller.
 */
export function createApiErrorResponse(
  code: ApiErrorCode,
  customMessage?: string,
  headers?: Record<string, string>
) {
  const config = ERROR_MAP[code] || ERROR_MAP.INTERNAL_ERROR;
  const body = {
    error: {
      code,
      message: customMessage || config.message
    }
  };

  return NextResponse.json(body, {
    status: config.status,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {})
    }
  });
}
