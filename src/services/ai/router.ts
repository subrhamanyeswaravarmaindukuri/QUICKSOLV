import { generateGeminiContent, GeminiStudyResponse, GeminiOptions } from "./gemini";
import { generateOxAlphaContent } from "./oxalpha";
import { searchPatsnap, PatentResult } from "./patsnap";
import { evaluateMathExpression, compareCalculations } from "./calculation";
import { analyzeUserRequest } from "./intent";
import { aiProviderRegistry } from "./providers/registry";

export interface RouterOptions {
  prompt: string;
  mode?: string;
  image?: {
    mimeType: string;
    data: string;
    highResolution?: boolean;
  };
  pdf?: {
    mimeType: string;
    data: string;
  };
  modelOverride?: string;
  userGeminiKey?: string;
  userOpenRouterKey?: string;
  userName?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Heuristically detects if the user request involves current events or real-time lookup.
 */
function requiresSearchGrounding(prompt: string, mode?: string): boolean {
  if (mode === "research") return true;
  
  const keywords = [
    "latest", "newest", "current", "today", "yesterday", "who won",
    "recent", "news", "cricket tournament", "java version", "market today",
    "stock price", "release date", "current champion"
  ];
  const lowerPrompt = prompt.toLowerCase();
  return keywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Heuristically detects if the query is a specialized R&D, patent, IP, or material science query.
 */
function isPatentQuery(prompt: string): boolean {
  const keywords = [
    "patent", "intellectual property", "prior art", "invention", 
    "r&d", "assignee", "materials science", "molecular synthesis",
    "biotech innovation", "semiconductor process", "claims search",
    "infringement", "novelty search"
  ];
  const lowerPrompt = prompt.toLowerCase();
  return keywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Heuristically detects if the query is mathematical or contains calculations.
 */
function isMathematicalQuery(prompt: string, response?: GeminiStudyResponse): boolean {
  const keywords = [
    "solve", "calculate", "equation", "formula", "integral", "derivative",
    "sum", "multiply", "divide", "subtract", "algebra", "arithmetic", "fraction",
    "geometry", "trigonometry", "matrix", "vector", "limit", "value of"
  ];
  const lowerPrompt = prompt.toLowerCase();
  
  // Also check if Gemini returned formulas or numbers
  const responseHasFormulas = response && response.formulas && response.formulas.length > 0;
  
  return keywords.some(keyword => lowerPrompt.includes(keyword)) || !!responseHasFormulas;
}

/**
 * Main AI Routing entrypoint. Coordinates AI, calculations, Patsnap, and Search.
 */
export async function routeStudyRequest(options: RouterOptions): Promise<GeminiStudyResponse> {
  const analysis = analyzeUserRequest(options.prompt, options.mode, !!options.image, !!options.pdf);

  let effectivePrompt = options.prompt;
  if (options.history && options.history.length > 0) {
    const recentHistoryStr = options.history
      .slice(-6)
      .map(h => {
        let text = h.content;
        if (h.role === "assistant") {
          try {
            const p = JSON.parse(h.content);
            text = p.quick_answer || p.normal_solution || p.code || h.content;
          } catch {}
        }
        return `${h.role === "user" ? "User" : "Assistant"}: ${text.length > 600 ? text.substring(0, 600) + "..." : text}`;
      })
      .join("\n\n");
    effectivePrompt = `[PRIOR CONVERSATION HISTORY:\n${recentHistoryStr}]\n\nCurrent User Request: ${options.prompt}`;
  }

  if (analysis.requiresUserDataPrompt) {
    effectivePrompt += `\n\n[QUICKSOLV FACTUAL INTEGRITY DIRECTIVE]: The user is asking for a personalized asset (e.g., resume, CV, or cover letter) without providing specific details. Provide a professional structure, but explicitly ask the user for their actual information (work history, skills, education, target role) rather than fabricating fake experience, companies, or metrics.`;
  }

  const needsSearch = analysis.needsWebSearch || requiresSearchGrounding(options.prompt, options.mode);
  const needsPatent = (analysis.needsPatsnap || isPatentQuery(options.prompt)) && options.mode === "research";

  // Build Gemini options
  const geminiOpts: GeminiOptions = {
    prompt: effectivePrompt,
    mode: options.mode,
    image: options.image,
    pdf: options.pdf,
    modelOverride: options.modelOverride,
    searchGrounding: needsSearch,
    userGeminiKey: options.userGeminiKey,
    userOpenRouterKey: options.userOpenRouterKey,
    userName: options.userName,
    history: options.history
  };

  // Adjust image resolution: Automatically set high resolution if math/dense queries are suspected
  if (geminiOpts.image) {
    const isDenseOrMath = isMathematicalQuery(options.prompt) || 
      analysis.intent === "IMAGE_ANALYSIS" ||
      options.mode === "exam" || 
      options.mode === "formula" ||
      options.prompt.toLowerCase().includes("handwritten") ||
      options.prompt.toLowerCase().includes("read this") ||
      options.prompt.toLowerCase().includes("diagram");
    
    geminiOpts.image.highResolution = isDenseOrMath;
  }

  // 1. Core AI Query via Provider Registry (Modular Routing & Automated Fallback)
  let studyResponse: GeminiStudyResponse;
  studyResponse = await aiProviderRegistry.executeWithFallback({
    ...options,
    prompt: effectivePrompt
  });

  // 2. Patent Research Connector (Patsnap Eureka Integration)
  if (needsPatent) {
    try {
      const patsnapRes = await searchPatsnap(options.prompt);
      if (patsnapRes.success && patsnapRes.results.length > 0) {
        // Integrate Patsnap patent results into research findings
        const patentSummary = patsnapRes.results
          .map(p => `• Patent: ${p.title} (${p.patentNo})\n  Assignee: ${p.assignees.join(", ") || "N/A"}\n  Abstract: ${p.abstract}`)
          .join("\n\n");
        
        studyResponse.research_findings = `${studyResponse.research_findings || studyResponse.quick_answer || ""}\n\n[Patsnap Patent Findings]:\n${patentSummary}`;
        
        // Append patent links to sources
        const patentSources = patsnapRes.results.map(p => ({
          title: `${p.title} (${p.patentNo})`,
          url: `https://lens.org/lens/patent/${p.patentNo}` // Standard link fallback or placeholder
        }));
        
        studyResponse.sources = [
          ...(studyResponse.sources || []),
          ...patentSources
        ];
      } else if (patsnapRes.configError) {
        // Log configuration issue in development view
        studyResponse.research_findings = `${studyResponse.research_findings || ""}\n\n[System Notice: Patsnap integration is disabled or not configured in this environment.]`;
      }
    } catch (patsnapErr) {
      console.warn("Patsnap research step failed, continuing with Gemini research:", patsnapErr);
    }
  }

  // 3. Mathematical Verification Workflow
  if (isMathematicalQuery(options.prompt, studyResponse)) {
    // Attempt to verify formulas parsed from study response
    if (studyResponse.formulas && studyResponse.formulas.length > 0) {
      for (const item of studyResponse.formulas) {
        if (!item.formula) continue;
        
        // If there's an example calculation, let's verify it
        // Check if formula is like "E = mc^2" and it contains variables
        // Let's look at the quick_answer or normal_solution for numbers.
        // We will attempt to evaluate the formula item.formula
        const calc = evaluateMathExpression(item.formula);
        if (calc.success && calc.result) {
          console.log(`Verified formula: ${item.formula} -> ${calc.result}`);
        }
      }
    }

    // Try to extract arithmetic evaluation if present in quick_answer or normal_solution
    // e.g. "5 * 12 = 60" or "x = 42"
    // Let's ask Gemini to review if there's any arithmetic error detected
    // If the calculation differs, perform corrective query.
    // For robust verification, we search for expressions like "5 * 10" in the text and compare.
    // To make this fully solid, if we suspect a calculation mismatch, we run a prompt check:
    // We send variables to verify. If there is a calculation discrepancy, we re-query Gemini.
    try {
      const mathVerificationPrompt = `Verify the calculations in the following explanation:
"${studyResponse.normal_solution}"

If there are calculations like basic arithmetic (e.g. 5.12 * 3.4 or square roots), write down:
1. The expression to calculate (e.g. "5.12 * 3.4").
2. The expected result.
Output in JSON:
{
  "calculations": [
    { "expression": "5.12 * 3.4", "model_result": "17.408" }
  ]
}`;
      
      const verificationResponse = await generateGeminiContent({
        prompt: mathVerificationPrompt,
        modelOverride: "gemini-3.6-flash"
      });

      // If we got calculations, evaluate them programmatically
      if (verificationResponse && verificationResponse.calculations) {
        const calcs = verificationResponse.calculations;
        let correctionNeeded = false;
        let correctionDetails = "";

        for (const c of calcs) {
          const evalRes = evaluateMathExpression(c.expression);
          if (evalRes.success && evalRes.result) {
            if (!compareCalculations(evalRes.result, c.model_result)) {
              correctionNeeded = true;
              correctionDetails += `Expression "${c.expression}" calculated as "${c.model_result}" but mathjs verified it is "${evalRes.result}".\n`;
            }
          }
        }

        if (correctionNeeded) {
          console.warn("Calculation discrepancy detected! Re-generating study package with corrections...", correctionDetails);
          
          // Re-query Gemini with corrective instructions
          const correctedPrompt = `${options.prompt}
          
[IMPORTANT: Calculation Correction]
The following arithmetic calculations have been verified programmatically and must be corrected in your response:
${correctionDetails}
Please adjust all explanations, step-by-step reasoning, and final answers to match these verified values.`;

          studyResponse = await generateGeminiContent({
            ...geminiOpts,
            prompt: correctedPrompt
          });
        }
      }
    } catch (mathErr) {
      console.warn("Mathematical verification pre-pass failed, defaulting to original model output:", mathErr);
    }
  }

  // 4. Quality Control Validation Pipeline
  studyResponse = await validateAndCorrectResponse(studyResponse, options, geminiOpts);

  return studyResponse;
}

/**
 * Universal Quality-Control Validation pipeline.
 * Programmatically checks code completeness, syntax, and language alignment.
 */
async function validateAndCorrectResponse(
  response: GeminiStudyResponse,
  options: RouterOptions,
  geminiOpts: GeminiOptions
): Promise<GeminiStudyResponse> {
  let studyResponse = response;
  let attempts = 0;
  const maxAttempts = 2;
  let isValid = false;

  while (!isValid && attempts < maxAttempts) {
    attempts++;
    const validationErrors: string[] = [];

    // 1. Detect requested language from prompt
    const p = options.prompt.toLowerCase();
    let expectedLanguage = "";
    if (p.includes("in c++") || p.includes("using c++")) expectedLanguage = "cpp";
    else if (p.includes("in c ") || p.includes("using c ") || p.includes("in c\n") || p.includes("in c\r")) expectedLanguage = "c";
    else if (p.includes("in python") || p.includes("using python")) expectedLanguage = "python";
    else if (p.includes("in java ") || p.includes("using java ") || p.includes("in java\n")) expectedLanguage = "java";
    else if (p.includes("in javascript") || p.includes("using javascript") || p.includes("in js")) expectedLanguage = "javascript";
    else if (p.includes("in typescript") || p.includes("using typescript") || p.includes("in ts")) expectedLanguage = "typescript";
    else if (p.includes("in rust") || p.includes("using rust")) expectedLanguage = "rust";
    else if (p.includes("in go ") || p.includes("using go ") || p.includes("in go\n")) expectedLanguage = "go";
    else if (p.includes("in sql") || p.includes("using sql")) expectedLanguage = "sql";

    // 2. Validate Code in Coding Mode
    if (studyResponse.coding_mode) {
      const code = studyResponse.coding_mode.code || "";
      
      // Check completeness
      if (code.includes("TODO") || code.includes("insert code here") || (code.includes("...") && code.length < 150)) {
        validationErrors.push("The generated code block is incomplete or contains placeholders.");
      }

      // Check language mismatch
      if (expectedLanguage) {
        if (expectedLanguage === "c" && !code.includes("#include") && !code.includes("printf")) {
          validationErrors.push(`Requested C programming language but code does not appear to be standard C syntax.`);
        }
        if (expectedLanguage === "cpp" && !code.includes("#include") && !code.includes("std::")) {
          validationErrors.push(`Requested C++ programming language but code does not appear to be standard C++ syntax.`);
        }
        if (expectedLanguage === "python" && (code.includes("const ") || code.includes("var ") || code.includes("function ") || (code.includes("{") && code.includes("}")))) {
          validationErrors.push(`Requested Python programming language but code contains braces or keyword declarations matching JS/C.`);
        }
      }
    }

    // 3. Validate Code in Sections
    if (studyResponse.sections) {
      for (const section of studyResponse.sections) {
        if (section.type === "code") {
          const codeText = section.content || section.code || "";
          if (codeText.includes("TODO") || codeText.includes("insert code here") || (codeText.includes("...") && codeText.length < 150)) {
            validationErrors.push("A generated code section is incomplete or contains placeholders.");
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      console.warn(`Quality validation failed (attempt ${attempts}):`, validationErrors);
      
      const correctedPrompt = `${options.prompt}

[IMPORTANT: Response Quality Control Failure]
Your previous response failed validation checks:
${validationErrors.map(err => `- ${err}`).join("\n")}
Please regenerate the entire response and make sure the code is completely written, structurally valid, and matches the correct requested language with zero placeholders.`;

      studyResponse = await generateGeminiContent({
        ...geminiOpts,
        prompt: correctedPrompt
      });
    } else {
      isValid = true;
    }
  }

  return studyResponse;
}
