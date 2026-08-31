import { NextResponse } from "next/server";
import { quickSolvHealthMonitor } from "@/core/observability/health";

export const dynamic = "force-static";

export async function GET() {
  const health = await quickSolvHealthMonitor.getLivenessStatus();
  return NextResponse.json(health, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json"
    }
  });
}
