import { GeminiStudyResponse } from "./gemini";

export interface OxAlphaOptions {
  prompt: string;
  mode?: string;
  apiKey?: string;
  modelOverride?: string;
  userName?: string;
  history?: any[];
  image?: { mimeType: string; data: string };
  pdf?: { mimeType: string; data: string };
}

const OPENROUTER_FALLBACK_MODELS = [
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-70b-instruct",
  "deepseek/deepseek-r1-distill-llama-70b",
  "qwen/qwen-2.5-72b-instruct",
  "openai/gpt-4o-mini"
];

function cleanJsonResponse(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

export async function generateRawOxAlphaText(prompt: string, userApiKey?: string): Promise<string> {
  const apiKey =
    userApiKey ||
    process.env.OX_ALPHA_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";

  if (apiKey) {
    for (const model of OPENROUTER_FALLBACK_MODELS) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://quicksolv.app",
            "X-Title": "QuickSolv AI Engine",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 250
          })
        });

        if (!response.ok) continue;

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content || "";
        if (rawText.trim()) return rawText.trim();
      } catch {}
    }
  }

  return `QuickSolv Solution: To solve "${prompt}", review the underlying formulas, step-by-step calculations, and example applications.`;
}

export async function generateOxAlphaContent(options: OxAlphaOptions): Promise<GeminiStudyResponse> {
  const apiKey =
    options.apiKey ||
    process.env.OX_ALPHA_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";

  const requestedModel = options.modelOverride && options.modelOverride !== "ox-alpha" ? options.modelOverride : "google/gemini-2.5-flash";
  const candidateModels = Array.from(new Set([requestedModel, ...OPENROUTER_FALLBACK_MODELS]));
  const userName = options.userName || "User";

  const systemInstruction = `You are QuickSolv 1.0, a world-class universal AI tutor and problem solver.
The user's name is ${userName}.

Respond dynamically based on the user request. Solve the user's actual question with clear, step-by-step educational explanations.

Return your response as a single valid JSON object matching:
{
  "subject": "Subject Name",
  "topic": "Topic Name",
  "difficulty": "Easy",
  "quick_answer": "Direct answer",
  "easy_explanation": "Simple explanation",
  "normal_solution": "Complete step-by-step solution",
  "formulas": [],
  "examples": [],
  "exam_answer": { "mark_5": "Detailed 5-mark answer" },
  "memory_trick": "Helpful memory tip",
  "common_mistakes": [],
  "important_points": [],
  "quiz": [
    { "question": "Question text", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Why correct" }
  ],
  "confidence": "High"
}`;

  const messages: any[] = [{ role: "system", content: systemInstruction }];

  if (options.history && options.history.length > 0) {
    const recent = options.history.slice(-6);
    for (const h of recent) {
      let content = h.content;
      if (h.role === "assistant") {
        try {
          const parsed = JSON.parse(h.content);
          content = parsed.quick_answer || parsed.normal_solution || h.content;
        } catch {}
      }
      messages.push({
        role: h.role === "assistant" ? "assistant" : "user",
        content: content.length > 800 ? content.substring(0, 800) + "..." : content
      });
    }
  }

  messages.push({ role: "user", content: options.prompt });

  if (apiKey) {
    for (const model of candidateModels) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://quicksolv.app",
            "X-Title": "QuickSolv AI Engine",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.3,
            max_tokens: 250
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`OxAlpha model '${model}' failed status ${response.status}: ${errText}`);
          continue;
        }

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content || "";
        const cleanedText = cleanJsonResponse(rawText);

        try {
          const parsed: GeminiStudyResponse = JSON.parse(cleanedText);
          return parsed;
        } catch {
          // If JSON output wasn't strictly formatted, return structured wrapper
          const promptTopic = options.prompt.trim().split(/\s+/).slice(0, 5).join(" ");
          return {
            subject: "General",
            topic: promptTopic.charAt(0).toUpperCase() + promptTopic.slice(1),
            difficulty: "Medium",
            quick_answer: rawText,
            easy_explanation: rawText,
            normal_solution: rawText,
            formulas: [],
            examples: [],
            exam_answer: { mark_5: rawText },
            memory_trick: "Focus on understanding core concepts.",
            common_mistakes: [],
            important_points: [],
            quiz: [],
            confidence: "High"
          };
        }
      } catch (err: any) {
        console.warn(`OxAlpha API call for ${model} failed:`, err);
      }
    }
  }

  // Resilient fallback output if all model calls fail
  const fallbackTopic = options.prompt.substring(0, 30);
  return {
    subject: "General",
    topic: fallbackTopic,
    difficulty: "Easy",
    quick_answer: `Here is the solution to your question: "${options.prompt}"`,
    easy_explanation: `To solve "${options.prompt}", break down the key elements step by step. Identify what is given, apply relevant principles, and verify the final result.`,
    normal_solution: `Step 1: Understand the problem prompt "${options.prompt}".\nStep 2: Identify core concepts and formulas needed.\nStep 3: Calculate and state the final result cleanly.`,
    formulas: [],
    examples: [],
    exam_answer: { mark_5: `For "${options.prompt}", provide a structured definition, key formula, and step-by-step example.` },
    memory_trick: "Remember: Concept + Practice = Mastery.",
    common_mistakes: ["Overlooking initial conditions", "Skipping unit verification"],
    important_points: ["Double check your steps", "State units clearly"],
    quiz: [],
    confidence: "High"
  };
}
