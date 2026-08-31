import { NextResponse } from "next/server";
import { dbService } from "@/services/supabase";
import { quickSolvIntelligenceRouter } from "@/core/intelligence/intelligenceRouter";
import { quickSolvEntitlementService } from "@/core/billing/entitlementService";
import { quickSolvCreditDeduction } from "@/core/billing/creditDeduction";
import { generateGeminiContent, generateRawGeminiText, generateGeminiContentStream } from "@/services/ai/gemini";
import { tryResolveCalculator } from "@/services/ai/calculation";

import { checkRateLimit } from "@/core/security/rateLimiter";
import { createApiErrorResponse } from "@/core/security/apiErrors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, mode, image, pdf, conversationId, userId, userName, type, topic, subject, difficulty, numQuestions, userGeminiKey, userOpenRouterKey, modelOverride, requestId } = body;

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous-client";
    const rateKey = userId || clientIp;
    const rateCheck = await checkRateLimit(rateKey, 30, 60000);
    if (rateCheck.limited) {
      return createApiErrorResponse("RATE_LIMIT_EXCEEDED", "Too many requests. Please wait a moment before sending another request.", {
        "X-RateLimit-Limit": String(rateCheck.limit),
        "X-RateLimit-Remaining": String(rateCheck.remaining),
        "X-RateLimit-Reset": String(rateCheck.resetTime)
      });
    }

    if (prompt && typeof prompt === "string" && prompt.length > 50000) {
      return createApiErrorResponse("INVALID_REQUEST", "Prompt exceeds maximum allowed size (50,000 characters).");
    }

    const activeUserId = userId || "demo-user-123";

    // 1. Authoritative Server-Side Entitlement Check
    const userEntitlement = await quickSolvEntitlementService.getEntitlement(activeUserId);
    if (userEntitlement.creditMode === "FINITE" && userEntitlement.creditsRemaining !== null && userEntitlement.creditsRemaining <= 0) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_CREDITS",
          message: `You have reached your monthly credit limit (${userEntitlement.monthlyCreditLimit} credits). Upgrade your plan to Plus or Pro for additional credits.`,
          entitlement: userEntitlement
        },
        { status: 403 }
      );
    }

    // Check if it is a quiz generation request
    if (type === "quiz-generate") {
      if (!topic) {
        return NextResponse.json({ error: "Topic is required for quiz generation" }, { status: 400 });
      }

      await quickSolvCreditDeduction.deductCredits({
        correlationId: `quiz_gen_${Date.now()}`,
        userId: activeUserId,
        creditsToDeduct: 1,
        requestType: "tool"
      });

      const dateSalt = new Date().toDateString();
      const userSalt = activeUserId;
      const quizPrompt = `Generate a highly accurate, unique educational quiz on the topic "${topic}" with difficulty level "${difficulty || "Easy"}".
This quiz is custom generated for user identifier "${userSalt}" on date "${dateSalt}".
The questions must be highly original, challenging, and unique to this specific user and date. Make sure the questions do not repeat previous editions.
The quiz must contain exactly ${numQuestions || 5} questions.
For each question, provide 4 options, a single correct answer (which must exactly match one of the options), and a detailed explanation of why it is correct.

Output MUST be a single, valid JSON object matching this schema:
{
  "title": "Quiz Title",
  "subject": "Subject Name",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A (must exactly match one of the options)",
      "explanation": "Explanation text"
    }
  ]
}`;

      try {
        const quizResponse = await generateGeminiContent({
          prompt: quizPrompt,
          mode: "quiz",
          userGeminiKey,
          userOpenRouterKey
        });

        const quizData: any = typeof quizResponse === "string" ? JSON.parse(quizResponse) : { ...quizResponse };
        if (quizData.quiz && Array.isArray(quizData.quiz) && !quizData.questions) {
          quizData.questions = quizData.quiz;
        }

        return NextResponse.json({
          success: true,
          quiz: quizData
        });
      } catch (aiErr: any) {
        console.error("AI Quiz Generation failed:", aiErr);
        return NextResponse.json(
          {
            error: "API_FAILURE",
            message: `QuickSolv couldn't connect to the AI service. Please verify your API Key configuration in settings and try again. (Details: ${aiErr.message || "Unknown error"})`
          },
          { status: 500 }
        );
      }
    }

    // Check if it is a study plan generation request
    if (type === "study-plan-generate") {
      if (!topic || !subject) {
        return NextResponse.json({ error: "Subject and Topic are required for study plan generation" }, { status: 400 });
      }

      await quickSolvCreditDeduction.deductCredits({
        correlationId: `study_plan_${Date.now()}`,
        userId: activeUserId,
        creditsToDeduct: 1,
        requestType: "tool"
      });

      const planPrompt = `Generate a highly organized, day-by-day 7-day study plan for the subject "${subject}" and topic "${topic}" with difficulty level "${difficulty || "Medium"}".
For each of the 7 days, provide a day title, a brief description, and exactly 2 tasks to complete.
Output MUST be a single, valid JSON object matching this schema:
{
  "subject": "${subject}",
  "topic": "${topic}",
  "difficulty": "${difficulty || "Medium"}",
  "days": [
    {
      "dayNum": 1,
      "title": "Day title",
      "description": "Short description of target learning goal",
      "tasks": [
        { "id": "t1-1", "text": "Task description", "completed": false },
        { "id": "t1-2", "text": "Task description", "completed": false }
      ]
    }
  ]
}`;

      try {
        const planResponse = await generateGeminiContent({
          prompt: planPrompt,
          mode: "all-in-one",
          userGeminiKey,
          userOpenRouterKey
        });

        let parsed = planResponse;
        if (typeof planResponse === "string") {
          parsed = JSON.parse(planResponse);
        }

        return NextResponse.json({
          success: true,
          plan: parsed
        });
      } catch (aiErr: any) {
        console.error("AI Study Plan Generation failed:", aiErr);
        return NextResponse.json(
          {
            error: "API_FAILURE",
            message: `QuickSolv couldn't connect to the AI service. Please verify your API Key configuration in settings and try again. (Details: ${aiErr.message || "Unknown error"})`
          },
          { status: 500 }
        );
      }
    }

    // Check if it is a note summarization request
    if (type === "note-summarize") {
      const { noteTitle, noteContent } = body;
      if (!noteContent) {
        return NextResponse.json({ error: "Note content is required for summarization" }, { status: 400 });
      }

      await quickSolvCreditDeduction.deductCredits({
        correlationId: `note_sum_${Date.now()}`,
        userId: activeUserId,
        creditsToDeduct: 1,
        requestType: "tool"
      });

      const summarizePrompt = `You are QuickSolv 1.0 AI tutor. Summarize these student notes in a highly structured, concise, and educational manner.
Target ~800 characters of high information density prioritizing direct answers, key takeaways, and concise bullet points.
Title: "${noteTitle || "Untitled Note"}"
Content:
"""
${noteContent}
"""`;

      try {
        const summaryResponse = await generateRawGeminiText(summarizePrompt, undefined, userGeminiKey, userOpenRouterKey);

        return NextResponse.json({
          success: true,
          result: summaryResponse
        });
      } catch (aiErr: any) {
        return NextResponse.json(
          {
            error: "API_FAILURE",
            message: "QuickSolv couldn't summarize your notes right now. Please try again.",
            devError: aiErr?.message
          },
          { status: 500 }
        );
      }
    }

    // Check if it is a note explanation request
    if (type === "note-explain") {
      const { noteTitle, noteContent } = body;
      if (!noteContent) {
        return NextResponse.json({ error: "Note content is required for explanation" }, { status: 400 });
      }

      await quickSolvCreditDeduction.deductCredits({
        correlationId: `note_exp_${Date.now()}`,
        userId: activeUserId,
        creditsToDeduct: 1,
        requestType: "tool"
      });

      const explainPrompt = `You are QuickSolv 1.0 AI tutor. Explain core concepts from these student notes simply and concisely (~800 characters target, high information density).
Title: "${noteTitle || "Untitled Note"}"
Content:
"""
${noteContent}
"""`;

      try {
        const explanationResponse = await generateRawGeminiText(explainPrompt, undefined, userGeminiKey, userOpenRouterKey);

        return NextResponse.json({
          success: true,
          result: explanationResponse
        });
      } catch (aiErr: any) {
        return NextResponse.json(
          {
            error: "API_FAILURE",
            message: "QuickSolv couldn't explain your notes right now. Please try again.",
            devError: aiErr?.message
          },
          { status: 500 }
        );
      }
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 2. Perform QuickSolv 1.0 Execution Engine Request Processing
    let activeMode = mode || "all-in-one";

    // Auto-detect hackathon context from problem statement keywords in the prompt
    if (activeMode === "all-in-one") {
      if (prompt.toLowerCase().includes("problem statement") || prompt.toLowerCase().includes("hackathon") || prompt.toLowerCase().includes("project")) {
        activeMode = "hackathon";
      }
    }

    // Load conversation history to retain context
    let historyList: any[] = [];
    if (conversationId) {
      try {
        historyList = await dbService.getMessages(conversationId);
      } catch (historyErr) {
        console.warn("Failed to load conversation history:", historyErr);
      }
    }

    // Resolve dynamic tool calculations first
    const calcResult = tryResolveCalculator(prompt);
    let finalPrompt = prompt;
    if (calcResult !== null) {
      finalPrompt = `${prompt}\n\n[Calculator Tool Verification: The formula evaluates precisely to ${calcResult}. Use this exact value in your final response.]`;
    }

    if (activeMode === "chat") {
      let activeConvId = conversationId;
      if (!activeConvId) {
        const title = prompt.substring(0, 30);
        const description = prompt;
        const conv = await dbService.createConversation(activeUserId, title, description, "General");
        activeConvId = conv.id;
      }

      await dbService.addMessage(
        activeConvId,
        "user",
        prompt,
        image?.mimeType ? `attached:${image.mimeType}` : undefined,
        activeMode
      );

      // Deduct 1 credit for standard chat stream or 2 for vision stream
      const isVision = !!image || !!pdf;
      await quickSolvCreditDeduction.deductCredits({
        correlationId: `chat_stream_${Date.now()}`,
        userId: activeUserId,
        creditsToDeduct: isVision ? 2 : 1,
        requestType: isVision ? "vision" : "chat",
        isMultimodal: isVision
      });

      const encoder = new TextEncoder();
      let accumulatedText = "";
      let requestSignal: AbortSignal | undefined = undefined;
      try {
        requestSignal = request.signal;
      } catch {
        // Safe fallback
      }

      const stream = new ReadableStream({
        async start(controller) {
          try {
            accumulatedText = await generateGeminiContentStream(
              {
                prompt: finalPrompt,
                mode: activeMode,
                image: image ? { mimeType: image.mimeType, data: image.data } : undefined,
                pdf: pdf ? { mimeType: pdf.mimeType, data: pdf.data } : undefined,
                userGeminiKey,
                userOpenRouterKey,
                userName: userName || "",
                history: historyList,
                modelOverride: modelOverride
              },
              requestSignal,
              (chunk) => {
                controller.enqueue(encoder.encode(chunk));
              }
            );
          } catch (streamErr: any) {
            console.error("Streaming content generation failed:", streamErr);
            const errMsg = "QuickSolv couldn't connect to the AI service. Please verify your API Key configuration in settings and try again.";
            controller.enqueue(encoder.encode(errMsg));
            accumulatedText = errMsg;
          } finally {
            const promptTopic = prompt
              ? prompt.trim().split(/\s+/).slice(0, 5).join(" ")
              : "General Topic";
            const formattedTopic = promptTopic.charAt(0).toUpperCase() + promptTopic.slice(1);

            const studyResponse = {
              subject: "General",
              topic: formattedTopic,
              difficulty: "Easy",
              quick_answer: accumulatedText || "No response generated.",
              easy_explanation: accumulatedText || "No response generated.",
              normal_solution: accumulatedText || "No response generated.",
              formulas: [],
              examples: [],
              exam_answer: {},
              memory_trick: "",
              common_mistakes: [],
              important_points: [],
              quiz: [],
              confidence: "High"
            };

            try {
              await dbService.addMessage(
                activeConvId,
                "assistant",
                JSON.stringify(studyResponse),
                undefined,
                activeMode
              );
            } catch (dbErr) {
              console.error("Failed to save assistant streaming message to DB:", dbErr);
            }

            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "x-conversation-id": activeConvId,
          "x-request-id": requestId || "",
          "Transfer-Encoding": "chunked"
        }
      });
    }

    // 3. Process via QuickSolv 1.0 Intelligence Engine Architecture
    let engineResult;
    try {
      engineResult = await quickSolvIntelligenceRouter.processRequest({
        prompt: finalPrompt,
        mode: activeMode,
        image: image ? { mimeType: image.mimeType, data: image.data } : undefined,
        pdf: pdf ? { mimeType: pdf.mimeType, data: pdf.data } : undefined,
        modelOverride: modelOverride || "auto",
        userName: userName || "",
        history: historyList,
        userGeminiKey,
        userOpenRouterKey
      });
    } catch (aiErr: any) {
      console.error("QuickSolv Intelligence Engine processing failed:", aiErr);
      return NextResponse.json(
        {
          error: "API_FAILURE",
          message: `QuickSolv couldn't connect to the AI service. Please verify your API Key configuration in settings and try again. (Details: ${aiErr.message || "Unknown error"})`
        },
        { status: 500 }
      );
    }

    // Deduct 1 credit for standard request or 2 credits for vision request
    const isVision = !!image || !!pdf;
    const correlationId = engineResult.metadata?.correlationId || `qs_req_${Date.now()}`;
    await quickSolvCreditDeduction.deductCredits({
      correlationId,
      userId: activeUserId,
      creditsToDeduct: isVision ? 2 : 1,
      requestType: isVision ? "vision" : "solve",
      isMultimodal: isVision
    });

    // Save history to database
    let activeConvId = conversationId;
    if (!activeConvId) {
      const title = engineResult.studyResponse.topic || prompt.substring(0, 30);
      const description = prompt;
      const subject = engineResult.studyResponse.subject || "General";
      const conv = await dbService.createConversation(activeUserId, title, description, subject);
      activeConvId = conv.id;
    }

    // Save user message
    await dbService.addMessage(
      activeConvId,
      "user",
      prompt,
      image?.mimeType ? `attached:${image.mimeType}` : undefined,
      activeMode
    );

    // Save AI message
    await dbService.addMessage(
      activeConvId,
      "assistant",
      JSON.stringify(engineResult.studyResponse),
      undefined,
      activeMode
    );

    const updatedEntitlement = await quickSolvEntitlementService.getEntitlement(activeUserId);

    return NextResponse.json({
      success: true,
      conversationId: activeConvId,
      requestId: requestId || correlationId,
      response: engineResult.studyResponse,
      metadata: engineResult.metadata,
      entitlement: updatedEntitlement
    });
  } catch (err: any) {
    console.error("API Chat route failed:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "QuickSolv couldn't process this right now. Please try again." },
      { status: 500 }
    );
  }
}
