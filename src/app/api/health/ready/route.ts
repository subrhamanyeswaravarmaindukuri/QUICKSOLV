import { NextResponse } from "next/server";
import { quickSolvHealthMonitor } from "@/core/observability/health";

export const dynamic = "force-static";

export async function GET() {
  const readiness = await quickSolvHealthMonitor.getReadinessStatus();
  return NextResponse.json(readiness, {
    status: readiness.ready ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json"
    }
  });
}
