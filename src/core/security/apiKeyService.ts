import crypto from "crypto";

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
  rate_limit_rpm: number;
  monthly_credit_limit: number;
  scopes: string[];
}

export type ApiKeyValidationResult =
  | { valid: true; keyRecord: ApiKeyRecord }
  | { valid: false; errorReason: "INVALID_API_KEY" | "API_KEY_EXPIRED" | "API_KEY_REVOKED" };

/**
 * Computes a secure SHA-256 hash of a plaintext API key string.
 */
export function hashApiKey(plaintextKey: string): string {
  return crypto.createHash("sha256").update(plaintextKey.trim()).digest("hex");
}

/**
 * Performs a timing-safe equality check between two hex-encoded hashes.
 * Prevents side-channel timing analysis attacks on API key verification.
 */
export function timingSafeCompareHashes(hashA: string, hashB: string): boolean {
  if (hashA.length !== hashB.length) return false;
  try {
    const bufA = Buffer.from(hashA, "hex");
    const bufB = Buffer.from(hashB, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy QuickSolv API Key secret.
 * Format: qs_live_<32 random hex characters>
 * Returns the plaintext key (to show developer ONCE) and the pre-computed hash for DB insertion.
 */
export function generateApiKeySecret(prefix: string = "qs_live_"): {
  plaintextKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const plaintextKey = `${prefix}${randomBytes}`;
  const keyPrefix = plaintextKey.substring(0, 12);
  const keyHash = hashApiKey(plaintextKey);

  return {
    plaintextKey,
    keyPrefix,
    keyHash
  };
}

/**
 * Masks an API key for safe UI presentation and non-sensitive logging.
 * Example: qs_live_9a8b3c...4f2e
 */
export function maskApiKey(apiKeyStr: string): string {
  if (!apiKeyStr || apiKeyStr.length < 12) return "invalid_key";
  const start = apiKeyStr.substring(0, 12);
  const end = apiKeyStr.substring(apiKeyStr.length - 4);
  return `${start}...${end}`;
}

/**
 * Validates a Bearer API Key against stored record metadata.
 */
export function validateApiKeyStatus(record: ApiKeyRecord): ApiKeyValidationResult {
  if (record.revoked_at) {
    return { valid: false, errorReason: "API_KEY_REVOKED" };
  }

  if (record.expires_at) {
    const expiry = new Date(record.expires_at).getTime();
    if (Date.now() > expiry) {
      return { valid: false, errorReason: "API_KEY_EXPIRED" };
    }
  }

  return { valid: true, keyRecord: record };
}
