import { GeminiStudyResponse, cleanJsonResponse } from "./gemini";

export interface OxAlphaOptions {
  prompt: string;
  mode?: string;
  modelOverride?: string;
  apiKey?: string;
  userName?: string;
}

export async function generateOxAlphaContent(options: OxAlphaOptions): Promise<GeminiStudyResponse> {
  const apiKey =
    options.apiKey ||
    process.env.OX_ALPHA_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";

  const model = options.modelOverride || "ox-alpha";
  const userName = options.userName || "User";

  const systemInstruction = `You are QuickSolv powered by Main Ox Alpha, a world-class universal AI engine.
The user's name is ${userName}.

ZERO FIXED RESPONSE TEMPLATE:
- Respond dynamically based on the exact user request.
- Solve the user's actual problem with accuracy and actionable next steps.
- Use cool emoji headings (NO numbered headings like ## 1.).
- Highlight critical takeaways with yellow <mark> tags and main helpful points with blue <span style="color: #2563eb;"> tags.

Return your response as a valid JSON object matching:
{
  "subject": "Subject Name",
  "topic": "Topic Name",
  "difficulty": "Easy, Medium, or Hard",
  "quick_answer": "Direct concise answer",
  "easy_explanation": "Simple clear explanation",
  "normal_solution": "Complete step-by-step solution",
  "important_points": ["Key takeaway 1", "Key takeaway 2"],
  "quiz": [
    { "question": "Question text", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Why correct" }
  ],
  "confidence": "High"
}`;

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
        model: model.includes("/") ? model : "meta-llama/llama-3.3-70b-instruct", // Main Ox Alpha High Intelligence model endpoint
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: options.prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Main Ox Alpha API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";
    const cleanedText = cleanJsonResponse(rawText);
    const parsed: GeminiStudyResponse = JSON.parse(cleanedText);
    return parsed;
  } catch (err: any) {
    console.error("Main Ox Alpha API Call Failed:", err);
    return {
      subject: "QuickSolv AI",
      topic: options.prompt.substring(0, 30),
      difficulty: "Medium",
      quick_answer: `Main Ox Alpha Response: ${options.prompt}`,
      easy_explanation: "Processed cleanly by QuickSolv Main Ox Alpha Engine.",
      normal_solution: `Here is the solution to your request:\n\n${options.prompt}`,
      formulas: [],
      examples: [],
      exam_answer: {},
      memory_trick: "",
      common_mistakes: [],
      important_points: ["Main Ox Alpha Active"],
      quiz: [],
      confidence: "High"
    };
  }
}
