import { NextResponse } from "next/server";
import { dbService, supabase } from "@/services/supabase";
import { createApiErrorResponse } from "@/core/security/apiErrors";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "key_demo_123" }];
}

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const resolvedParams = await params;
    const keyId = resolvedParams.id;

    if (!keyId) {
      return createApiErrorResponse("INVALID_REQUEST", "Key ID is required.");
    }

    const success = await dbService.revokeApiKey(userId, keyId);
    if (!success) {
      return createApiErrorResponse("INVALID_REQUEST", "Key not found or user unauthorized.");
    }

    return NextResponse.json({ success: true, message: "API Key revoked successfully." });
  } catch (err: any) {
    console.error("DELETE /api/developer/keys/[id] error:", err);
    return createApiErrorResponse("INTERNAL_ERROR", "Failed to revoke API key.");
  }
}
