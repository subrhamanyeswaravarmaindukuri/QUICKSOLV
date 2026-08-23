import { NextResponse } from "next/server";
import { routeStudyRequest } from "@/services/ai/router";
import { dbService } from "@/services/supabase";
import { generateGeminiContent, generateRawGeminiText, generateGeminiContentStream } from "@/services/ai/gemini";
import { tryResolveCalculator } from "@/services/ai/calculation";

// Offline fallback templates have been fully removed to ensure 100% dynamic AI-generated responses.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, mode, image, pdf, conversationId, userId, userName, type, topic, subject, difficulty, numQuestions, userGeminiKey, userOpenRouterKey, modelOverride, requestId } = body;

    // Check if it is a quiz generation request
    if (type === "quiz-generate") {
      if (!topic) {
        return NextResponse.json({ error: "Topic is required for quiz generation" }, { status: 400 });
      }

      const activeUserId = userId || "demo-user-123";

      // 1. Check Usage Limits
      const usage = await dbService.checkUsageLimit(activeUserId);
      if (usage.count >= usage.max) {
        return NextResponse.json(
          {
            error: "Usage limit exceeded",
            message: "You have used your 10 free study credits for this month. Upgrade to Pro for unlimited access."
          },
          { status: 403 }
        );
      }

      // Increment usage count
      await dbService.incrementUsage(activeUserId);

      const dateSalt = new Date().toDateString();
      const userSalt = activeUserId;
      const quizPrompt = `Generate a highly accurate, unique educational quiz on the topic "${topic}" with difficulty level "${difficulty || "Easy"}".
This quiz is custom generated for user identifier "${userSalt}" on date "${dateSalt}".
The questions must be highly original, challenging, and unique to this specific user and date. Make sure the questions do not repeat previous editions.
The quiz must contain exactly ${numQuestions || 5} questions.
For each question, provide 4 options, a single correct answer (which must exactly match one of the options), and a detailed explanation of why it is correct.

IMPORTANT: Make sure all the questions are unique, challenging, and randomly generated. Even if this topic has been requested before, vary the questions completely so they are different and never repeat. Focus on interesting and deep concepts appropriate for the '${difficulty || "Easy"}' difficulty level.

Output MUST be a single, valid JSON object matching this schema:
{
  "title": "Quiz Title (e.g., Photosynthesis Basics)",
  "subject": "Subject Name (e.g., Biology)",
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

      const activeUserId = userId || "demo-user-123";

      // 1. Check Usage Limits
      const usage = await dbService.checkUsageLimit(activeUserId);
      if (usage.count >= usage.max) {
        return NextResponse.json(
          {
            error: "Usage limit exceeded",
            message: "You have used your 10 free study credits for this month. Upgrade to Pro for unlimited access."
          },
          { status: 403 }
        );
      }

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
          mode: "all-in-one", // Will output dynamic structured JSON matching study schema
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

      const activeUserId = userId || "demo-user-123";

      // Usage Limits Check
      const usage = await dbService.checkUsageLimit(activeUserId);
      if (usage.count >= usage.max) {
        return NextResponse.json(
          {
            error: "Usage limit exceeded",
            message: "You have used your 10 free study credits for this month. Upgrade to Pro for unlimited access."
          },
          { status: 403 }
        );
      }

      await dbService.incrementUsage(activeUserId);

      const summarizePrompt = `You are a world-class study tutor. Summarize these student notes in a highly structured, concise, and educational manner.
Provide key takeaways, bullet points, and bulleted lists.
Use appropriate emojis for readability.
Here are the notes:
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

      const activeUserId = userId || "demo-user-123";

      // Usage Limits Check
      const usage = await dbService.checkUsageLimit(activeUserId);
      if (usage.count >= usage.max) {
        return NextResponse.json(
          {
            error: "Usage limit exceeded",
            message: "You have used your 10 free study credits for this month. Upgrade to Pro for unlimited access."
          },
          { status: 403 }
        );
      }

      await dbService.incrementUsage(activeUserId);

      const explainPrompt = `You are a world-class study tutor. Read the following student notes and explain the core concepts, difficult terminology, and complex terms in an incredibly simple, intuitive, and easy-to-understand manner.
Use relatable real-world analogies, step-by-step breakdowns, and clean formatting.
Here are the notes:
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

    // Check if it is a note quiz generation request
    if (type === "note-quiz-generate") {
      const { noteTitle, noteContent } = body;
      if (!noteContent) {
        return NextResponse.json({ error: "Note content is required for quiz generation" }, { status: 400 });
      }

      const activeUserId = userId || "demo-user-123";

      // Usage Limits Check
      const usage = await dbService.checkUsageLimit(activeUserId);
      if (usage.count >= usage.max) {
        return NextResponse.json(
          {
            error: "Usage limit exceeded",
            message: "You have used your 10 free study credits for this month. Upgrade to Pro for unlimited access."
          },
          { status: 403 }
        );
      }

      await dbService.incrementUsage(activeUserId);

      const quizPrompt = `Generate a highly accurate 5-question educational quiz directly based on the information in the following notes.
For each question, provide 4 options, a single correct answer (which must exactly match one of the options), and a detailed explanation of why it is correct.
Notes Title: "${noteTitle || "Untitled Note"}"
Notes Content:
"""
${noteContent}
"""
Output MUST be a single, valid JSON object matching this schema:
{
  "title": "Quiz on: ${noteTitle || "Custom Notes"}",
  "subject": "Biology",
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

        return NextResponse.json({
          success: true,
          quiz: quizResponse
        });
      } catch (aiErr: any) {
        return NextResponse.json(
          {
            error: "API_FAILURE",
            message: "QuickSolv couldn't generate a quiz from your notes right now. Please try again.",
            devError: aiErr?.message
          },
          { status: 500 }
        );
      }
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Default or fallback user ID
    const activeUserId = userId || "demo-user-123";

    // 1. Check Usage Limits
    const usage = await dbService.checkUsageLimit(activeUserId);
    if (usage.count >= usage.max) {
      return NextResponse.json(
        {
          error: "Usage limit exceeded",
          message: "You have used your 10 free study credits for this month. Upgrade to Pro for unlimited access."
        },
        { status: 403 }
      );
    }

    // 2. Perform AI Routing and processing
    let activeMode = mode || "all-in-one";

    // Auto-detect hackathon context from problem statement keywords in the prompt (only if in all-in-one mode)
    if (activeMode === "all-in-one") {
      if (prompt.toLowerCase().includes("problem statement") || prompt.toLowerCase().includes("hackathon") || prompt.toLowerCase().includes("project")) {
        activeMode = "hackathon";
      }
    }

    // Load conversation history to retain context if we're in the same chat
    let historyList: any[] = [];
    if (conversationId) {
      try {
        historyList = await dbService.getMessages(conversationId);
        const lowerPrompt = prompt.toLowerCase();
        
        // If user explicitly asks to exit hackathon or switch modes
        const isExitRequest = lowerPrompt.includes("not for hackathon") || 
                              lowerPrompt.includes("not a hackathon") || 
                              lowerPrompt.includes("exit hackathon") ||
                              lowerPrompt.includes("normal mode") ||
                              lowerPrompt.includes("study notes");

        if (isExitRequest) {
          activeMode = "all-in-one";
        } else if (activeMode === "all-in-one") {
          // Check if previous user query or assistant response was hackathon related
          const hasHackathonInHistory = historyList.some((m: any) => {
            if (m.role === "user" && m.mode === "hackathon") return true;
            if (m.role === "assistant") {
              try {
                const parsed = JSON.parse(m.content);
                return !!parsed.hackathon_mode;
              } catch {
                return false;
              }
            }
            return false;
          });

          if (hasHackathonInHistory) {
            activeMode = "hackathon";
          }
        }
      } catch (historyErr) {
        console.warn("Failed to load conversation history: ", historyErr);
      }
    }

    // Auto-detect other modes if activeMode is "all-in-one"
    if (activeMode === "all-in-one") {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes("research") || lowerPrompt.includes("paper") || lowerPrompt.includes("citation")) {
        activeMode = "research";
      } else if (lowerPrompt.includes("quiz") || lowerPrompt.includes("test me") || lowerPrompt.includes("mcq") || lowerPrompt.includes("question paper")) {
        activeMode = "quiz";
      } else if (lowerPrompt.includes("notes") || lowerPrompt.includes("summary") || lowerPrompt.includes("revision") || lowerPrompt.includes("explain in simple words")) {
        activeMode = "notes";
      } else if (lowerPrompt.includes("code") || lowerPrompt.includes("debug") || lowerPrompt.includes("compile") || lowerPrompt.includes("bug") || lowerPrompt.includes("refactor") || lowerPrompt.includes("program")) {
        activeMode = "coding";
      } else if (lowerPrompt.includes("math") || lowerPrompt.includes("equation") || lowerPrompt.includes("solve") || lowerPrompt.includes("calculation") || lowerPrompt.includes("calculate") || lowerPrompt.includes("fraction")) {
        activeMode = "math";
      } else if (lowerPrompt.includes("compare") || lowerPrompt.includes("versus") || lowerPrompt.includes("vs ") || lowerPrompt.includes("difference between")) {
        activeMode = "comparison";
      } else if (lowerPrompt.includes("how to") || lowerPrompt.includes("step by step") || lowerPrompt.includes("guide") || lowerPrompt.includes("manual") || lowerPrompt.includes("instructions")) {
        activeMode = "how_to";
      } else if (lowerPrompt.includes("ppt") || lowerPrompt.includes("slide") || lowerPrompt.includes("presentation") || lowerPrompt.includes("pitch deck") || lowerPrompt.includes("hackathon") || lowerPrompt.includes("mvp") || lowerPrompt.includes("project")) {
        activeMode = "hackathon";
      } else if (lowerPrompt.includes("business") || lowerPrompt.includes("startup") || lowerPrompt.includes("market") || lowerPrompt.includes("competitor") || lowerPrompt.includes("revenue") || lowerPrompt.includes("pricing") || lowerPrompt.includes("marketing")) {
        activeMode = "business";
      } else if (lowerPrompt.includes("career") || lowerPrompt.includes("interview") || lowerPrompt.includes("resume") || lowerPrompt.includes("job") || lowerPrompt.includes("linkedin") || lowerPrompt.includes("mock interview") || lowerPrompt.includes("lpa")) {
        activeMode = "career";
      } else if (lowerPrompt.includes("binary search") || lowerPrompt.includes("sorting") || lowerPrompt.includes("dsa") || lowerPrompt.includes("algorithm") || lowerPrompt.includes("tree") || lowerPrompt.includes("graph") || lowerPrompt.includes("linked list") || lowerPrompt.includes("recursion") || lowerPrompt.includes("sliding window")) {
        activeMode = "dsa";
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

      // Save original user message to database immediately
      await dbService.addMessage(
        activeConvId,
        "user",
        prompt,
        image?.mimeType ? `attached:${image.mimeType}` : undefined,
        activeMode
      );

      // Increment usage limit immediately
      await dbService.incrementUsage(activeUserId);

      const encoder = new TextEncoder();
      let accumulatedText = "";

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
              request.signal,
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
            // Save final generated response (JSON-wrapped) to history
            const studyResponse = {
              subject: "General",
              topic: "Chat Conversation",
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

    let studyResponse;
    try {
      studyResponse = await routeStudyRequest({
        prompt: finalPrompt,
        mode: activeMode,
        image: image ? { mimeType: image.mimeType, data: image.data } : undefined,
        pdf: pdf ? { mimeType: pdf.mimeType, data: pdf.data } : undefined,
        userGeminiKey,
        userOpenRouterKey,
        userName: userName || "",
        history: historyList
      });
    } catch (aiErr: any) {
      console.error("AI processing failed:", aiErr);
      return NextResponse.json(
        {
          error: "API_FAILURE",
          message: `QuickSolv couldn't connect to the AI service. Please verify your API Key configuration in settings and try again. (Details: ${aiErr.message || "Unknown error"})`
        },
        { status: 500 }
      );
    }

    // Increment usage count
    await dbService.incrementUsage(activeUserId);

    // Save history to database/storage
    let activeConvId = conversationId;
    if (!activeConvId) {
      const title = studyResponse.topic || prompt.substring(0, 30);
      const description = prompt;
      const subject = studyResponse.subject || "General";
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

    // Save AI message (JSON-stringified)
    await dbService.addMessage(
      activeConvId,
      "assistant",
      JSON.stringify(studyResponse),
      undefined,
      activeMode
    );

    return NextResponse.json({
      success: true,
      conversationId: activeConvId,
      requestId: requestId || null,
      response: studyResponse
    });
  } catch (err: any) {
    console.error("API Chat route failed:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "QuickSolv couldn't process this right now. Please try again." },
      { status: 500 }
    );
  }
}
