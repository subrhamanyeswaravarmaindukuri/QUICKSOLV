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
    const keys = await dbService.getApiKeys(userId);
    return NextResponse.json({ keys });
  } catch (err: any) {
    console.error("GET /api/developer/keys error:", err);
    return createApiErrorResponse("INTERNAL_ERROR", "Failed to retrieve API keys.");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const { name, scopes } = body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return createApiErrorResponse("INVALID_REQUEST", "Field 'name' is required and must be a string.");
    }

    const validScopes = ["solve:read", "chat:write", "code:full"];
    const selectedScopes = Array.isArray(scopes) && scopes.length > 0
      ? scopes.filter((s: string) => validScopes.includes(s))
      : ["solve:read", "chat:write"];

    const { keyRecord, plaintextKey } = await dbService.createApiKey(userId, name.trim(), selectedScopes);

    return NextResponse.json({
      success: true,
      key: keyRecord,
      secretKey: plaintextKey
    });
  } catch (err: any) {
    console.error("POST /api/developer/keys error:", err);
    return createApiErrorResponse("INTERNAL_ERROR", "Failed to create API key.");
  }
}
