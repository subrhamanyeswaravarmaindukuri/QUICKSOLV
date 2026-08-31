import { NextResponse } from "next/server";
import { hashApiKey, timingSafeCompareHashes, validateApiKeyStatus, ApiKeyRecord } from "./apiKeyService";
import { checkRateLimit } from "./rateLimiter";
import { createApiErrorResponse } from "./apiErrors";
import { dbService, supabase } from "@/services/supabase";

export interface AuthContext {
  userId: string;
  keyId: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitRpm: number;
}

export type AuthMiddlewareResult =
  | { success: true; context: AuthContext }
  | { success: false; errorResponse: NextResponse };

/**
 * Authenticates developer API request headers, validates API key hash using timing-safe comparisons,
 * verifies monthly credit limits, and checks rate limits.
 */
export async function authenticateApiRequest(
  request: Request,
  requiredScope?: string
): Promise<AuthMiddlewareResult> {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      success: false,
      errorResponse: createApiErrorResponse("UNAUTHORIZED", "Missing or malformed Authorization Bearer header.")
    };
  }

  const rawKey = authHeader.substring(7).trim();

  if (!rawKey || (!rawKey.startsWith("qs_live_") && !rawKey.startsWith("qs_test_"))) {
    return {
      success: false,
      errorResponse: createApiErrorResponse("INVALID_API_KEY", "API key must begin with valid prefix 'qs_live_' or 'qs_test_'.")
    };
  }

  const computedHash = hashApiKey(rawKey);
  let keyRecord: ApiKeyRecord | null = null;

  // 1. Fetch Key Record from Database
  if (supabase) {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", computedHash)
      .single();

    if (!error && data) {
      if (timingSafeCompareHashes(data.key_hash, computedHash)) {
        keyRecord = data as ApiKeyRecord;
      }
    }
  }

  // Fallback check for local simulation / test key
  if (!keyRecord && rawKey.startsWith("qs_test_demo_key")) {
    const demoHash = hashApiKey("qs_test_demo_key_1234567890abcdef");
    if (timingSafeCompareHashes(computedHash, demoHash) || rawKey === "qs_test_demo_key_1234567890abcdef") {
      keyRecord = {
        id: "key_demo_123",
        user_id: "demo-user-123",
        name: "Test Demo Key",
        key_prefix: rawKey.substring(0, 12),
        key_hash: computedHash,
        created_at: new Date().toISOString(),
        rate_limit_rpm: 60,
        monthly_credit_limit: 1000,
        scopes: ["solve:read", "chat:write", "code:full"]
      };
    }
  }

  if (!keyRecord) {
    return {
      success: false,
      errorResponse: createApiErrorResponse("INVALID_API_KEY", "The provided API key does not exist or has been deleted.")
    };
  }

  // 2. Check Key Status (Revoked / Expired)
  const statusCheck = validateApiKeyStatus(keyRecord);
  if (!statusCheck.valid) {
    return {
      success: false,
      errorResponse: createApiErrorResponse(statusCheck.errorReason)
    };
  }

  // 3. Verify Required Permission Scope
  if (requiredScope && !keyRecord.scopes.includes(requiredScope)) {
    return {
      success: false,
      errorResponse: createApiErrorResponse("FORBIDDEN", `API key lacks required scope '${requiredScope}'.`)
    };
  }

  // 4. Check Monthly Credit Quota
  const usage = await dbService.checkUsageLimit(keyRecord.user_id);
  if (usage.count >= usage.max) {
    return {
      success: false,
      errorResponse: createApiErrorResponse("QUOTA_EXCEEDED", "Monthly credit quota exceeded for this account.")
    };
  }

  // 5. Distributed Rate Limit Check (Key ID level)
  const rateCheck = await checkRateLimit(`key:${keyRecord.id}`, keyRecord.rate_limit_rpm || 60, 60000);
  if (rateCheck.limited) {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(rateCheck.limit),
      "X-RateLimit-Remaining": String(rateCheck.remaining),
      "X-RateLimit-Reset": String(rateCheck.resetTime)
    };
    return {
      success: false,
      errorResponse: createApiErrorResponse("RATE_LIMIT_EXCEEDED", "Rate limit exceeded for this API key.", headers)
    };
  }

  // Safe non-sensitive security logging
  console.log(`[API Auth] Key ID: ${keyRecord.id} | User ID: ${keyRecord.user_id} | Prefix: ${keyRecord.key_prefix}`);

  return {
    success: true,
    context: {
      userId: keyRecord.user_id,
      keyId: keyRecord.id,
      keyPrefix: keyRecord.key_prefix,
      scopes: keyRecord.scopes,
      rateLimitRpm: keyRecord.rate_limit_rpm
    }
  };
}
