import { NextResponse } from "next/server";
import { dbService, supabase } from "@/services/supabase";
import { createApiErrorResponse } from "@/core/security/apiErrors";

export const dynamic = "force-dynamic";

async function getUserId(request: Request): Promise<string> {
  if (supabase) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) return data.user.id;
    }
  }
  return "demo-user-123";
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const usage = await dbService.checkUsageLimit(userId);
    const keys = await dbService.getApiKeys(userId);

    const activeKeysCount = keys.filter((k: any) => !k.revoked_at).length;

    return NextResponse.json({
      success: true,
      usage: {
        creditsUsed: usage.count,
        monthlyLimit: usage.max === 999999 ? 1000 : usage.max,
        remainingCredits: Math.max(0, (usage.max === 999999 ? 1000 : usage.max) - usage.count),
        activeKeysCount,
        rateLimitRpm: 60
      }
    });
  } catch (err: any) {
    console.error("GET /api/developer/usage error:", err);
    return createApiErrorResponse("INTERNAL_ERROR", "Failed to retrieve developer usage data.");
  }
}
