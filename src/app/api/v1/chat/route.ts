import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/core/security/authMiddleware";
import { createApiErrorResponse } from "@/core/security/apiErrors";
import { routeStudyRequest } from "@/services/ai/router";
import { dbService } from "@/services/supabase";

export const dynamic = "force-static";

const SECURITY_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

export async function POST(request: Request) {
  // 1. Authenticate Request & Enforce Scopes, Quotas, and Rate Limits
  const authResult = await authenticateApiRequest(request, "chat:write");
  if (!authResult.success) {
    return authResult.errorResponse;
  }
  const { userId } = authResult.context;

  // 2. Validate JSON Request Body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return createApiErrorResponse("INVALID_REQUEST", "Request payload must be a valid JSON object.");
  }

  const { message, model = "auto", mode = "study" } = body || {};

  // 3. Validate Parameters
  if (!message || typeof message !== "string" || !message.trim()) {
    return createApiErrorResponse("INVALID_REQUEST", "Field 'message' is required and must be a non-empty string.");
  }

  if (message.length > 50000) {
    return createApiErrorResponse("INVALID_REQUEST", "Field 'message' exceeds maximum length of 50,000 characters.");
  }

  const supportedModels = [
    "auto",
    "ox-alpha",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-sonnet",
    "meta-llama/llama-3.3-70b-instruct:free"
  ];
  if (typeof model !== "string" || !supportedModels.includes(model)) {
    return createApiErrorResponse("INVALID_REQUEST", `Model '${model}' is not supported. Supported models: ${supportedModels.join(", ")}`);
  }

  const supportedModes = [
    "study",
    "general",
    "all-in-one",
    "research",
    "quiz",
    "notes",
    "coding",
    "math",
    "comparison",
    "how_to",
    "hackathon",
    "business",
    "career"
  ];
  if (typeof mode !== "string" || !supportedModes.includes(mode)) {
    return createApiErrorResponse("INVALID_REQUEST", `Mode '${mode}' is not supported. Supported modes: ${supportedModes.join(", ")}`);
  }

  // 4. Process AI Request via QuickSolv AI Core Router
  const requestId = "req_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  const targetMode = mode === "study" ? "all-in-one" : mode;
  const targetModel = model === "auto" ? "ox-alpha" : model;

  let studyResponse;
  try {
    studyResponse = await routeStudyRequest({
      prompt: message,
      mode: targetMode,
      modelOverride: targetModel
    });
  } catch (aiErr: any) {
    console.error(`[QuickSolv API v1 Chat] AI routing failed for request ${requestId}:`, aiErr?.message);
    return createApiErrorResponse("INTERNAL_ERROR", "QuickSolv AI engine encountered an error processing your request.");
  }

  // 5. Record Usage Credits
  await dbService.incrementUsage(userId);

  // 6. Format Clean API Response
  const primaryAnswer =
    studyResponse.quick_answer ||
    studyResponse.normal_solution ||
    studyResponse.easy_explanation ||
    "No response text generated.";

  const resolvedModel = model === "auto" ? "ox-alpha/gpt-4o" : model;

  return NextResponse.json(
    {
      id: requestId,
      object: "quicksolv.chat",
      answer: primaryAnswer,
      mode,
      model: resolvedModel,
      data: {
        subject: studyResponse.subject || "General",
        topic: studyResponse.topic || message.substring(0, 30),
        difficulty: studyResponse.difficulty || "Medium",
        easy_explanation: studyResponse.easy_explanation || "",
        normal_solution: studyResponse.normal_solution || "",
        formulas: studyResponse.formulas || [],
        examples: studyResponse.examples || [],
        exam_answer: studyResponse.exam_answer || {},
        memory_trick: studyResponse.memory_trick || "",
        important_points: studyResponse.important_points || [],
        quiz: studyResponse.quiz || []
      },
      usage: {
        credits: 1
      }
    },
    {
      headers: SECURITY_HEADERS
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: SECURITY_HEADERS
  });
}
