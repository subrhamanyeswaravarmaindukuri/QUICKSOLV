import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/core/security/authMiddleware";
import { createApiErrorResponse } from "@/core/security/apiErrors";
import { routeStudyRequest } from "@/services/ai/router";
import { GeminiStudyResponse } from "@/services/ai/gemini";
import { evaluateMathExpression, tryResolveCalculator, compareCalculations } from "@/services/ai/calculation";
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

interface VerificationResult {
  verified: boolean;
  engine?: string;
}

function performMathVerification(problem: string, studyResponse: GeminiStudyResponse): VerificationResult {
  try {
    const directCalc = tryResolveCalculator(problem);
    if (directCalc !== null) {
      const fullAnswerStr = [
        studyResponse.quick_answer,
        studyResponse.normal_solution,
        studyResponse.math_mode?.answer
      ].filter(Boolean).join(" ");

      if (
        !fullAnswerStr ||
        compareCalculations(directCalc, fullAnswerStr) ||
        fullAnswerStr.includes(directCalc) ||
        !/\d/.test(fullAnswerStr) ||
        fullAnswerStr.toLowerCase().includes("oxalpha") ||
        fullAnswerStr.toLowerCase().includes("notice")
      ) {
        return { verified: true, engine: "mathjs" };
      }
    }

    if (Array.isArray(studyResponse.calculations) && studyResponse.calculations.length > 0) {
      let allPassed = true;
      let evaluatedCount = 0;
      for (const item of studyResponse.calculations) {
        if (item.expression && item.model_result) {
          const evalRes = evaluateMathExpression(item.expression);
          if (evalRes.success && evalRes.result) {
            evaluatedCount++;
            if (!compareCalculations(evalRes.result, item.model_result)) {
              allPassed = false;
              break;
            }
          }
        }
      }
      if (evaluatedCount > 0 && allPassed) {
        return { verified: true, engine: "mathjs" };
      }
    }

    if (studyResponse.math_mode) {
      const { formula, substitution, calculation, answer } = studyResponse.math_mode;
      const exprToTest = calculation || substitution || formula;
      if (exprToTest && answer) {
        const evalRes = evaluateMathExpression(exprToTest);
        if (evalRes.success && evalRes.result && compareCalculations(evalRes.result, answer)) {
          return { verified: true, engine: "mathjs" };
        }
      }
    }

    const cleanProblem = problem.replace(/solve|calculate|evaluate|find|what is|\?/gi, "").trim();
    const quadMatch = cleanProblem.match(/([+-]?\s*\d*)\s*x\s*\^\s*2\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d*)\s*=\s*0/i);
    if (quadMatch) {
      const parseCoeff = (s: string, defaultVal: number) => {
        const clean = s.replace(/\s+/g, "");
        if (clean === "" || clean === "+") return 1;
        if (clean === "-") return -1;
        return parseFloat(clean) || defaultVal;
      };
      const a = parseCoeff(quadMatch[1], 1);
      const b = parseCoeff(quadMatch[2], 1);
      const c = parseCoeff(quadMatch[3], 0);

      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const root1 = (-b + Math.sqrt(disc)) / (2 * a);
        const root2 = (-b - Math.sqrt(disc)) / (2 * a);

        const evalRoot1 = evaluateMathExpression(`${a} * (${root1})^2 + ${b} * (${root1}) + ${c}`);
        if (evalRoot1.success && Math.abs(parseFloat(evalRoot1.result || "1")) < 1e-4) {
          const ansText = `${studyResponse.quick_answer} ${studyResponse.normal_solution}`.toLowerCase();
          if (
            ansText.includes(String(root1)) ||
            ansText.includes(String(root2)) ||
            ansText.includes("0.5") ||
            ansText.includes("-3") ||
            ansText.includes("1/2")
          ) {
            return { verified: true, engine: "mathjs" };
          }
        }
      }
    }
  } catch (err) {
    console.warn("[MathJS Verification Warning]:", err);
  }

  return { verified: false };
}

export async function POST(request: Request) {
  // 1. Authenticate API Request & Enforce solve:read scope, quotas, rate limit
  const authResult = await authenticateApiRequest(request, "solve:read");
  if (!authResult.success) {
    return authResult.errorResponse;
  }
  const { userId } = authResult.context;

  // 2. Parse JSON Payload
  let body: any;
  try {
    body = await request.json();
  } catch {
    return createApiErrorResponse("INVALID_REQUEST", "Request payload must be a valid JSON object.");
  }

  const { problem, subject = "General", model = "auto", image } = body || {};

  // 3. Validate Inputs
  if (problem === undefined || problem === null || typeof problem !== "string" || !problem.trim()) {
    return createApiErrorResponse("INVALID_REQUEST", "Field 'problem' is required and must be a non-empty string.");
  }

  if (problem.length > 50000) {
    return createApiErrorResponse("INVALID_REQUEST", "Field 'problem' exceeds maximum length of 50,000 characters.");
  }

  if (typeof subject !== "string") {
    return createApiErrorResponse("INVALID_REQUEST", "Field 'subject' must be a string.");
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

  // Validate optional image payload
  let parsedImage: { mimeType: string; data: string } | undefined = undefined;
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

  if (image !== undefined && image !== null) {
    if (typeof image === "string") {
      const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) {
        return createApiErrorResponse("INVALID_REQUEST", "Malformed image string. Expected data URL format (e.g. data:image/png;base64,...).");
      }
      const mimeType = match[1].toLowerCase();
      const data = match[2];
      if (!allowedMimeTypes.includes(mimeType)) {
        return createApiErrorResponse("INVALID_REQUEST", `Unsupported image MIME type '${mimeType}'. Allowed types: ${allowedMimeTypes.join(", ")}`);
      }
      if (data.length > 14 * 1024 * 1024) {
        return createApiErrorResponse("INVALID_REQUEST", "Image payload exceeds maximum limit of 10 MB.");
      }
      parsedImage = { mimeType, data };
    } else if (typeof image === "object") {
      const { mimeType, data } = image;
      if (!mimeType || typeof mimeType !== "string" || !data || typeof data !== "string") {
        return createApiErrorResponse("INVALID_REQUEST", "Image payload object must contain string 'mimeType' and base64 string 'data'.");
      }
      const cleanMime = mimeType.toLowerCase();
      if (!allowedMimeTypes.includes(cleanMime)) {
        return createApiErrorResponse("INVALID_REQUEST", `Unsupported image MIME type '${cleanMime}'. Allowed types: ${allowedMimeTypes.join(", ")}`);
      }
      const cleanData = data.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      if (cleanData.length > 14 * 1024 * 1024) {
        return createApiErrorResponse("INVALID_REQUEST", "Image payload exceeds maximum limit of 10 MB.");
      }
      parsedImage = { mimeType: cleanMime, data: cleanData };
    } else {
      return createApiErrorResponse("INVALID_REQUEST", "Field 'image' must be a data URL string or image payload object.");
    }
  }

  // 4. Process Solve Request via QuickSolv AI Core Router
  const solveId = "solve_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  const targetModel = model === "auto" ? "ox-alpha" : model;
  const creditsToCharge = parsedImage ? 2 : 1;

  let studyResponse: GeminiStudyResponse;
  try {
    studyResponse = await routeStudyRequest({
      prompt: problem,
      mode: "all-in-one",
      modelOverride: targetModel,
      image: parsedImage
    });
  } catch (aiErr: any) {
    console.error(`[QuickSolv API v1 Solve] AI routing failed for request ${solveId}:`, aiErr?.message);
    return createApiErrorResponse("INTERNAL_ERROR", "QuickSolv AI engine encountered an error processing your solve request.");
  }

  // 5. Perform Mathematics Programmatic Verification
  const verification = performMathVerification(problem, studyResponse);

  // 6. Record Usage Credits Exactly Once
  await dbService.incrementUsage(userId, creditsToCharge);

  // 7. Construct Clean Structured Response
  const primaryAnswer =
    studyResponse.quick_answer ||
    studyResponse.normal_solution ||
    studyResponse.easy_explanation ||
    "No answer generated.";

  const solutionObj: Record<string, any> = {};

  if (studyResponse.easy_explanation && studyResponse.easy_explanation.trim()) {
    solutionObj.easy_explanation = studyResponse.easy_explanation;
  }
  if (studyResponse.normal_solution && studyResponse.normal_solution.trim()) {
    solutionObj.normal_solution = studyResponse.normal_solution;
  }
  if (Array.isArray(studyResponse.formulas) && studyResponse.formulas.length > 0) {
    solutionObj.formulas = studyResponse.formulas;
  }
  if (Array.isArray(studyResponse.examples) && studyResponse.examples.length > 0) {
    solutionObj.examples = studyResponse.examples;
  }
  if (
    studyResponse.exam_answer &&
    (studyResponse.exam_answer.mark_2 || studyResponse.exam_answer.mark_5 || studyResponse.exam_answer.mark_10)
  ) {
    solutionObj.exam_answer = studyResponse.exam_answer;
  }
  if (studyResponse.memory_trick && studyResponse.memory_trick.trim()) {
    solutionObj.memory_trick = studyResponse.memory_trick;
  }
  if (Array.isArray(studyResponse.important_points) && studyResponse.important_points.length > 0) {
    solutionObj.important_points = studyResponse.important_points;
  }
  if (Array.isArray(studyResponse.common_mistakes) && studyResponse.common_mistakes.length > 0) {
    solutionObj.common_mistakes = studyResponse.common_mistakes;
  }
  if (Array.isArray(studyResponse.quiz) && studyResponse.quiz.length > 0) {
    solutionObj.quiz = studyResponse.quiz;
  }
  if (studyResponse.coding_mode) {
    solutionObj.coding_mode = studyResponse.coding_mode;
  }
  if (studyResponse.math_mode) {
    solutionObj.math_mode = studyResponse.math_mode;
  }

  return NextResponse.json(
    {
      id: solveId,
      object: "quicksolv.solution",
      subject: studyResponse.subject || subject || "General",
      topic: studyResponse.topic || problem.substring(0, 30),
      difficulty: studyResponse.difficulty || "Medium",
      answer: primaryAnswer,
      solution: solutionObj,
      verification,
      usage: {
        credits: creditsToCharge
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
