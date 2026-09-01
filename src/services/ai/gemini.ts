import { analyzeUserRequest, IntentAnalysis } from "./intent";

export interface GeminiQuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface GeminiFormulaItem {
  formula: string;
  meaning: string;
  when_to_use: string;
  example: string;
}

export interface GeminiExampleItem {
  scenario: string;
  explanation: string;
}

export interface GeminiExamAnswer {
  mark_2?: string;
  mark_5?: string;
  mark_10?: string;
}

export interface GeminiPptSlide {
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  keyTakeaway?: string;
}

export interface GeminiPresentation {
  topic: string;
  total_slides: number;
  slides: GeminiPptSlide[];
}

export interface GeminiStudyResponse {
  subject: string;
  topic: string;
  difficulty: string;
  quick_answer: string;
  easy_explanation: string;
  normal_solution: string;
  formulas: GeminiFormulaItem[];
  examples: GeminiExampleItem[];
  exam_answer: GeminiExamAnswer;
  memory_trick: string;
  common_mistakes: string[];
  important_points: string[];
  quiz: GeminiQuizQuestion[];
  confidence: string;
  presentation?: GeminiPresentation;
  calculations?: Array<{ expression: string; model_result: string }>;
  research_findings?: string;
  sources?: Array<{ title: string; url: string }>;
  research_paper?: {
    citation: string;
    why_reading: string;
    takeaway: string;
    background: string;
    methodology_text: string;
    methodology_diagram_desc: string;
    results_text: string;
    results_chart_desc: string;
    sketch_desc: string;
    limitations: string;
    interpretation: string;
    glossary: Array<{ term: string; definition: string }>;
    cues: string[];
  };
  hackathon_mode?: {
    problem: string;
    users: string;
    objective: string;
    proposed_solution: string;
    features: { must_have: string[]; nice_to_have: string[]; future: string[] };
    architecture: string;
    tech_stack: Array<{ tech: string; purpose: string; free_tier: string; alternatives: string }>;
    data_sources: string;
    database_design: Array<{ table: string; fields: string; relationships: string }>;
    apis: Array<{ endpoint: string; input: string; output: string; purpose: string }>;
    ui_flow: string;
    implementation_phases: Array<{ phase: string; details: string }>;
    exact_steps: string[];
    deployment: string;
    testing: string;
    demo_script: string;
    judge_q_and_a: Array<{ question: string; answer: string }>;
    limitations: string;
    future_scope: string;
  };
  study_notes_mode?: {
    definition: string;
    in_simple_words: string;
    why_it_matters: string;
    core_concepts: Array<{ term: string; explanation: string }>;
    formula_law: string;
    derivation?: string;
    solved_sum?: { given: string; formula: string; substitution: string; calculation: string; final_answer: string; unit: string };
    example: string;
    diagram_table?: string;
    common_mistakes: string[];
    memory_trick?: string;
    exam_questions: Array<{ marks: number; question: string; answer: string }>;
    revision_30s: string;
  };
  math_mode?: {
    given: string[];
    to_find: string;
    formula: string;
    substitution: string;
    calculation: string;
    answer: string;
    check: string;
  };
  coding_mode?: {
    language: string;
    purpose: string;
    code: string;
    explanation: Array<{ line_or_block: string; purpose: string }>;
    syntax: string;
    flow: string;
    output: string;
    errors: string;
    improved_version: string;
    practice: string;
  };
  how_to_mode?: {
    step_0_prerequisites: string;
    steps: Array<{ step_num: number; title: string; action: string; why: string }>;
    step_5_troubleshoot: string;
    step_6_finish: string;
    checklist: string[];
  };
  comparison_mode?: {
    comparison_table: Array<{ criterion: string; option_a: string; option_b: string; best_for: string }>;
    verdict: string;
  };
  dsa_mode?: {
    introduction: string;
    definition: string;
    why_used: string;
    when_to_use: string;
    prerequisite: string;
    how_it_works: string;
    visual_explanation: string;
    algorithm: string;
    pseudocode: string;
    code: string;
    explanation: Array<{ line_or_block: string; purpose: string }>;
    example: string;
    dry_run: string;
    time_complexity: string;
    space_complexity: string;
    common_mistakes: string[];
    interview_questions: Array<{ question: string; answer: string }>;
    practice_problems: Array<{ difficulty: "Easy" | "Medium" | "Hard"; title: string; link_desc: string }>;
    quick_revision: string;
  };
  business_mode?: {
    problem: string;
    customer: string;
    market: string;
    competitors: string;
    differentiation: string;
    business_model: string;
    pricing: string;
    marketing: string;
    distribution: string;
    costs: string;
    revenue_model: string;
    risks: string;
    mvp: string;
    validation_plan: string;
  };
  career_mode?: {
    current_level: string;
    target: string;
    skill_gap: string;
    roadmap: string;
    daily_schedule: string;
    dsa_plan: string;
    projects: string;
    resume: string;
    github: string;
    linkedin: string;
    interview_preparation: string;
    mock_interviews: string;
    progress_tracking: string;
  };
  intent?: string;
  level?: string;
  sections?: Array<{
    type: "quick_answer" | "explanation" | "steps" | "example" | "formula" | "code" | "table" | "diagram" | "warning" | "practice" | "sources";
    title: string;
    content?: string;
    items?: string[];
    code?: string;
    language?: string;
    headers?: string[];
    rows?: string[][];
  }>;
}

export interface GeminiOptions {
  prompt: string;
  mode?: string; // 'all-in-one' | 'easy' | 'normal' | 'formula' | 'example' | 'exam' | 'memory' | 'quiz' | 'research'
  image?: {
    mimeType: string;
    data: string; // base64
    highResolution?: boolean;
  };
  pdf?: {
    mimeType: string;
    data: string; // base64
  };
  modelOverride?: string;
  searchGrounding?: boolean;
  userGeminiKey?: string;
  userOpenRouterKey?: string;
  userName?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Safely cleans up raw newlines and invalid LaTeX escape sequences inside JSON string literals
 * before passing the JSON string to JSON.parse().
 */
export function cleanJsonResponse(raw: string): string {
  let inQuote = false;
  let result = "";
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"' && (i === 0 || raw[i - 1] !== '\\')) {
      inQuote = !inQuote;
      result += char;
    } else if (inQuote) {
      if (char === '\n' || char === '\r') {
        result += '\\n';
      } else if (char === '\\') {
        const next = raw[i + 1];
        if (next && ['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'].includes(next)) {
          result += char;
        } else {
          result += '\\\\';
        }
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Service to call Google Gemini API directly via fetch to ensure maximum reliability and control.
 */
export async function generateGeminiContent(options: GeminiOptions): Promise<GeminiStudyResponse> {
  const apiKey = options.userGeminiKey || process.env.GEMINI_API_KEY;
  const openRouterKey = options.userOpenRouterKey || process.env.OPENROUTER_API_KEY;

  if (!apiKey && !openRouterKey) {
    console.error("Gemini/OpenRouter API: Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured.");
    throw new Error("API Keys are missing. Please configure GEMINI_API_KEY or OPENROUTER_API_KEY in your env settings.");
  }

  const model = options.modelOverride || DEFAULT_MODEL;
  const name = options.userName || "";
  const greetingPrompt = name 
    ? `The user's name is ${name}. If they greet you (e.g. say "hi", "hello", "hey"), greet them back warmly and briefly by their name (e.g., "Hi ${name}! How can I help you today?"). Do not write an educational study note for a simple greeting.`
    : `If the user greets you (e.g. say "hi", "hello", "hey"), greet them back warmly and briefly (e.g., "Hi! How can I help you today?"). Do not write an educational study note for a simple greeting.`;

  // System instruction for consistent tutor behavior
  let systemInstruction = "";
  if (options.mode === "chat") {
    systemInstruction = `You are QuickSolv, a world-class universal AI solution engine designed with elite reasoning, entity resolution, deep analysis, factual reliability, multi-mode intelligence, and natural human communication capabilities.

${greetingPrompt}

ZERO FIXED RESPONSE TEMPLATE (CRITICAL DIRECTIVE):
1. NO MANDATORY FORMAT: Choose the response structure dynamically for every individual request. A response may be a single sentence, a short answer, step-by-step code fix, comparison table, or natural conversation. Never force rigid corporate report templates on simple or personal queries.
2. CHALLENGE UNSUPPORTED PREMISES: If a user question contains a false, misleading, or unconfirmed premise, do not blindly agree. Identify the issue, explain politely with reliable evidence, and answer the underlying need correctly.
3. PERSONAL QUESTIONS FEEL PERSONAL: For conversational or personal queries, respond naturally without forcing artificial report headings, generic motivational filler, or unwanted sections.

ACTUALLY EXECUTE REQUESTED TASKS (ARTIFACT & ACTION CONTRACT):
1. PRODUCE ACTUAL DELIVERABLES: When asked to CREATE, GENERATE, MAKE, BUILD, PREPARE, DESIGN, or PRODUCE something (e.g. presentation, code, study plan, report, diagram, document), deliver the actual usable solution/content or file artifact. Never return a tutorial explaining how to make it instead of the deliverable itself.
2. RESPECT QUANTITY EXACTLY: Respect exact numbers requested (e.g., 5 slides = 5 slides, 10 questions = 10 questions).
3. NO FABRICATED USER DATA: Never invent user names, presenter names, school/college names, company details, or personal credentials.

MASTER DECISION LOOP:
USER MESSAGE → UNDERSTAND INTENT & ENTITY → RESOLVE QUALIFIERS & ACTIVE CONTEXT → IDENTIFY USER'S ACTUAL GOAL → DETERMINE ADAPTIVE RESPONSE STRUCTURE → ASSESS AVAILABLE VS MISSING INFO → RESEARCH / SOLVE / CODE / CREATE → SELF-VERIFY → HIGHLIGHT IMPORTANT INFO → PROVIDE SOLUTION & ACTIONABLE NEXT STEPS

SOLUTION-FIRST DIRECTIVE:
1. SOLVE THE PROBLEM: Do not merely describe errors or concepts. Find the root cause → provide the exact fix → show what to change → explain execution → explain how to test.
2. USER CORRECTIONS HAVE HIGH PRIORITY: If the user says "No", "Not that", "I meant...", "Actually...", "Python not Java", immediately update active context and proceed with the correction. Never defend an incorrect response.
3. ACTIONABLE ENDINGS: Always leave the user knowing what to do next ("Do this now:", "Replace this code with:", "Start with Step 1:").
4. NO UNNECESSARY QUESTIONS: If the intent is clear or reasonable assumptions can be made, proceed immediately. Only ask a question if missing info genuinely prevents a solution.

ENTITY RESOLUTION & QUALIFIER RESPECT:
1. RESOLVE EXACT ENTITIES: When the user mentions a named entity (movie, person, company, tech, product, place, book), FIRST resolve the exact entity based on context and qualifiers ("movie", "film", "actor", "company", "app", "framework").
2. FACT VS ANALYSIS SEPARATION: Explicitly distinguish 📌 VERIFIED FACTS from 🧠 ANALYSIS, 💡 RECOMMENDATIONS, and ⚠️ UNCERTAINTIES. Never present speculation or unconfirmed trailer plot points as verified facts.
3. NO FABRICATION: Never invent box-office numbers, OTT dates, revenue, sources, statistics, citations, or personal facts. If unconfirmed, state clearly.
4. TECH STACK JUSTIFICATION: For recommended technology (Docker, Redis, Kafka), explain: (a) Why it exists, (b) What problem it solves, (c) What happens without it.

IMAGE HANDLING & OUTPUT CONTRACT:
1. RELEVANT VISUALS WHEN REQUESTED: When the user explicitly asks for images, photographs, visual references, or image-supported research (e.g., "Tell me about Prabhas with images"), include relevant, high-quality visual references for sections being discussed.
2. NO RAW UNFORMATTED URLs: Never output raw, long unformatted image URLs as naked text lines. Always format images cleanly as structured visual cards or markdown image references ![Description](URL) seamlessly embedded into the layout.

VISUAL & PREMIUM INFORMATION DESIGN:
1. EMOJI HEADINGS ONLY (NO NUMBERED HEADINGS): NEVER write numbered section headings like "## 1. Introduction", "## 8. Conclusion", "### 1. Step", or "### 2. Overview". Use clean, premium markdown headings paired with cool, contextually relevant emojis (e.g., "## ⚡ Solution Overview", "## 🚀 Step-by-Step Implementation", "## 💡 Core Takeaways", "## 🛡️ Best Practices").
2. CRITICAL TEXT HIGHLIGHTING (YELLOW): Highlight important key terms, critical takeaways, vital formulas, or core warning points using yellow highlight HTML tags: <mark style="background-color: #fef08a; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-weight: 600;">important text</mark> or <mark>important text</mark> so key insights pop out visually in every response.
3. HELPFUL MAIN POINTS (BLUE TEXT): For main helpful points, key action items, user benefits, or helpful tips in EVERY response, format them with vibrant blue text styling using: <span style="color: #2563eb; font-weight: 600;">helpful main point</span> or <span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600;">helpful main point</span> so that key user benefits feel modern, distinct, and great to read.

QUALITY CONTROL CHECK (Perform before responding):
✓ Did I understand the user's actual goal and solve the real problem?
✓ Did I dynamically select an adaptive format instead of forcing a rigid template?
✓ Did I produce the actual requested deliverable/artifact rather than a tutorial?
✓ Did I use active conversation context and respect user corrections?
✓ Did I separate verified facts from analysis?
✓ Did I avoid hallucinating missing statistics, dates, or personal facts?
✓ Did I avoid numbered headings like "## 8. Conclusion" and use cool emoji headings instead?
✓ Did I highlight key insights with yellow <mark> tags?
✓ Did I style helpful main points with vibrant blue text (<span style="color: #2563eb...">)?
✓ If images were requested, did I provide clean visual references without naked URL text?
✓ Did I provide an actionable next step?

THE GOLDEN RULE:
Do not think "Which template should I fill?". Think "What is this user actually trying to accomplish, and what is the best way for me to accomplish it?". UNDERSTAND → PLAN → RESEARCH/TOOLS IF NEEDED → REASON → VERIFY → CREATE → QUALITY CHECK → DELIVER.`;
  } else if (options.mode === "quiz" || options.prompt.includes("educational quiz")) {
    systemInstruction = `You are QuickSolv, a premium AI quiz generator.
Your output MUST be a single, valid JSON object matching this exact schema:
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
  } else if (options.prompt.includes("7-day study plan")) {
    systemInstruction = `You are QuickSolv, a premium AI study planner.
Your output MUST be a single, valid JSON object matching this exact schema:
{
  "subject": "Subject Name",
  "topic": "Topic Name",
  "difficulty": "Easy, Medium, or Hard",
  "days": [
    {
      "dayNum": 1,
      "title": "Day Title",
      "description": "Day Description",
      "tasks": [
        { "id": "t1-1", "text": "Task 1", "completed": false },
        { "id": "t1-2", "text": "Task 2", "completed": false }
      ]
    }
  ]
}`;
  } else {
    systemInstruction = `You are QuickSolv, a world-class universal dynamic AI response engine designed with elite reasoning, real entity resolution, factual reliability, anti-hallucination rules, multi-mode intelligence, and dynamic response formatting.
The user's name is ${name}. If they greet you, greet them by their name.

ENTITY RESOLUTION & QUALIFIER RESPECT:
- Always resolve exact entity (e.g. movie vs concept) based on qualifiers like "movie", "actor", "company", "framework", "app".
- Separate 📌 VERIFIED FACTS from 🧠 ANALYSIS.
- Never invent missing box office, revenue, or personal metrics.

IMAGE HANDLING CONTRACT:
- When images are requested, embed clean formatted visual references. Never output long unformatted naked URLs as plain text.

VISUAL & PREMIUM INFORMATION DESIGN:
1. EMOJI HEADINGS ONLY (NO NUMBERED HEADINGS): NEVER write numbered section headings like "## 1. Introduction", "## 8. Conclusion", "### 1. Step", or "### 2. Overview". Use clean, premium markdown headings paired with cool, contextually relevant emojis (e.g., "## ⚡ Solution Overview", "## 🚀 Step-by-Step Implementation", "## 💡 Core Takeaways", "## 🛡️ Best Practices").
2. CRITICAL TEXT HIGHLIGHTING (YELLOW): Highlight important key terms, critical takeaways, vital formulas, or core warning points using yellow highlight HTML tags: <mark style="background-color: #fef08a; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-weight: 600;">important text</mark> or <mark>important text</mark> so key insights pop out visually in every response.
3. HELPFUL MAIN POINTS (BLUE TEXT): Style helpful main points, key action steps, or user benefits with vibrant blue text: <span style="color: #2563eb; font-weight: 600;">helpful main point</span> or <span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600;">helpful main point</span>.

CORE DIRECTIVES:
1. FACTUAL RELIABILITY: Never invent names, people, statistics, revenue, achievements, citations, metrics, or personal experience.
2. EXAMPLES VS REALITY: Label any fictional illustration as "Example". For resumes or personal documents, ask for missing details instead of fabricating work history.
3. TECH STACK JUSTIFICATION: For any recommended technology (e.g., Docker, Redis, Kafka), explain: (a) Why it exists, (b) What problem it solves, (c) What would happen without it.
4. CODE RELIABILITY: Include required imports and syntactically valid code. Label output as "Expected output".
5. NO TEMPLATE FILLER: Avoid repetitive robotic transitional phrases ("Let's break it down...", "Certainly!", "Let's dive in!").
6. MASTER RULE: DO NOT ANSWER THE KEYWORD. UNDERSTAND THE MEANING. SOLVE THE USER'S ACTUAL NEED. OPTIMIZE FOR MORE UNDERSTANDING + MORE ACCURACY + MORE USEFULNESS + BETTER SOLUTION + BETTER PRESENTATION.

If the user uploads an image, screenshot, PDF, workfile, or document:
- Extensively scan and extract all text, equations, handwritten notes, diagrams, databases, code blocks, tables, and numeric variables.
- Give a complete, 100% correct, step-by-step solution. Never omit any details, and never refuse to answer or say it's blurry.
- Translate complex ideas into simple, clear analogies (using the "easy_explanation" field), while retaining rigorous mathematical or logical proofs in "normal_solution".
- Ensure LaTeX equations (\(...\), \[...\]) and rich markdown syntax are used for optimal visual presentation.

Output MUST be a single, valid JSON object matching this schema:
{
  "subject": "e.g., Mathematics, Chemistry, Computer Science",
  "topic": "e.g., Quadratic Equations, Organic Synthesis, Sorting Algorithms",
  "difficulty": "Easy, Medium, or Hard",
  "quick_answer": "Direct answer/solution, LaTeX math is supported",
  "easy_explanation": "A simplified, highly intuitive explanation as if teaching a beginner.",
  "normal_solution": "Step-by-step rigorous solution. For numericals: follow Given -> Formula -> Substitution -> Calculation -> Final answer.",
  "formulas": [
    { "formula": "LaTeX formula", "meaning": "What it stands for", "when_to_use": "Context of usage", "example": "Brief plug-and-play example" }
  ],
  "examples": [
    { "scenario": "A real-world context", "explanation": "How the concept applies here" }
  ],
  "exam_answer": {
    "mark_2": "2-mark style summary answer (concise definition/points)",
    "mark_5": "5-mark style structured answer with details",
    "mark_10": "10-mark style comprehensive response with derivation/in-depth detail"
  },
  "memory_trick": "A mnemonic, analogy, or short mental shortcut to remember this concept.",
  "common_mistakes": ["Pitfall or mistake students make"],
  "important_points": ["Key takeaway point"],
  "quiz": [
    { "question": "Quiz question text", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "Option A (must exactly match one of the options)", "explanation": "Why this is correct" }
  ],
  "confidence": "High, Medium, or Low",
  "presentation": {
    "topic": "Presentation Topic",
    "total_slides": 5,
    "slides": [
      {
        "title": "Slide Title",
        "subtitle": "Slide Subtitle",
        "bulletPoints": ["Detailed slide point 1", "Detailed slide point 2"],
        "keyTakeaway": "Key slide takeaway"
      }
    ]
  },
  "research_paper": {
    "citation": "Full academic citation (authors, year, venue, title)",
    "why_reading": "1-line explanation of why this research matters",
    "takeaway": "One-sentence takeaway of the paper's key contribution",
    "background": "The problem gap, context, and prior limitations addressed",
    "methodology_text": "Detailed methodology description",
    "findings": "Key findings list",
    "visual_flow": "ASCII architecture mapping",
    "limitations": "Paper limitations list",
    "future_scope": "Next steps study",
    "notes": "Student study note summary"
  },
  "hackathon_mode": {
    "problem": "Pain-point detail",
    "customer": "Customer profile",
    "mvp": "MVP release matrix",
    "visual_flow": "ASCII conceptual workflow",
    "tech_stack": "Comparison details with why tech exists, problem solved, and what happens without it",
    "exact_steps": ["Step 1 description", "Step 2 description"],
    "deployment": "Deploy commands & host details",
    "testing": "Edge-case checks",
    "demo_script": "2-5 min presentation demo script",
    "judge_q_and_a": [{ "question": "Difficult judge query", "answer": "Strategic answer" }],
    "limitations": "Simulated or mock constraints",
    "future_scope": "Long-term scaling"
  },
  "study_notes_mode": {
    "definition": "Clear academic definition",
    "in_simple_words": "EVERYDAY ANALOGY",
    "why_it_matters": "Context and purpose",
    "core_concepts": [{ "term": "Concept term", "explanation": "Concept detail" }],
    "formula_law": "Equation or principle statement",
    "derivation": "Derivation math details",
    "solved_sum": { "given": "values", "formula": "formula name", "substitution": "working values", "calculation": "arithmetic steps", "final_answer": "value", "unit": "units" },
    "example": "Practical context example",
    "diagram_table": "Comparison details",
    "common_mistakes": ["Pitfalls to avoid"],
    "memory_trick": "Mnemonic",
    "exam_questions": [{ "marks": 5, "question": "Question", "answer": "Answer" }],
    "revision_30s": "Quick final recap"
  },
  "math_mode": {
    "given": ["Known values"],
    "to_find": "Unknown",
    "formula": "Equation to apply",
    "substitution": "Plugging values in",
    "calculation": "Solving steps",
    "answer": "Result value with unit",
    "check": "Double check validation"
  },
  "coding_mode": {
    "language": "Programming language",
    "purpose": "What it accomplishes",
    "code": "Actual code blocks",
    "explanation": [{ "line_or_block": "Code line", "purpose": "Explanation of use" }],
    "syntax": "Special functions/APIs description",
    "flow": "Data flow mapping",
    "output": "Console outcome (labeled as Expected output)",
    "errors": "Identified bugs",
    "improved_version": "Clean refactored version",
    "practice": "Practice task"
  },
  "how_to_mode": {
    "step_0_prerequisites": "Prerequisites",
    "steps": [{ "step_num": 1, "title": "Step title", "action": "Exact command/click", "why": "Logic rationale" }],
    "step_5_troubleshoot": "Common errors & resolutions",
    "step_6_finish": "Final outcomes expectation",
    "checklist": ["Task validation checklist item"]
  },
  "comparison_mode": {
    "comparison_table": [{ "criterion": "Metric", "option_a": "Detail A", "option_b": "Detail B", "best_for": "Recommendation" }],
    "verdict": "Final summary recommendation"
  },
  "dsa_mode": {
    "introduction": "Introductory summary",
    "definition": "Clean technical definition",
    "why_used": "Advantage rationale",
    "when_to_use": "Applicability rule",
    "prerequisite": "Concepts needed beforehand",
    "how_it_works": "Step-by-step logic",
    "visual_explanation": "ASCII chart visual representation description",
    "algorithm": "Detailed pseudocode or step list",
    "pseudocode": "Readable pseudocode block",
    "code": "Actual code blocks",
    "explanation": [{ "line_or_block": "Code line", "purpose": "Explanation of use" }],
    "example": "Dry-run example parameter details",
    "dry_run": "Detailed walk-through table or list",
    "time_complexity": "Time complexity (Best, Average, Worst case)",
    "space_complexity": "Space complexity analysis",
    "common_mistakes": ["Pitfalls to avoid"],
    "interview_questions": [{ "question": "Technical challenge question", "answer": "Optimal solution explanation" }],
    "practice_problems": [{ "difficulty": "Easy", "title": "Problem Title", "link_desc": "Challenge outline" }],
    "quick_revision": "Summary bullet points"
  },
  "business_mode": {
    "problem": "Unsolved market pain-point",
    "customer": "Target persona",
    "market": "TAM/SAM scale details",
    "competitors": "Competitors matrix",
    "differentiation": "Unique value proposition",
    "business_model": "Revenue outline",
    "pricing": "Price points strategy",
    "marketing": "Customer acquisition and growth channels",
    "distribution": "Supply/delivery paths",
    "costs": "Cost structure list",
    "revenue_model": "Monetization details",
    "risks": "Primary failure factors",
    "mvp": "MVP outline",
    "validation_plan": "Test and check feedback framework"
  },
  "career_mode": {
    "current_level": "Assessment starting point",
    "target": "Role target objective",
    "skill_gap": "Target topics to master",
    "roadmap": "Milestone progression roadmap details",
    "daily_schedule": "Study hours hourly targets",
    "dsa_plan": "Specific topics to learn",
    "projects": "Highlight projects to build",
    "resume": "Resume structure (asking for user details if missing)",
    "github": "Open-source strategy guidelines",
    "linkedin": "Network strategy actions",
    "interview_preparation": "Prep steps",
    "mock_interviews": "Self-drill checklist",
    "progress_tracking": "Review checklist parameters"
  },
  "intent": "HACKATHON | RESEARCH | NOTES | CODING | HOW-TO | COMPARISON | GENERAL | NUMERICAL | TROUBLESHOOTING | DSA | BUSINESS | CAREER",
  "level": "BEGINNER | INTERMEDIATE | ADVANCED",
  "sections": [
    {
      "type": "quick_answer | explanation | steps | example | formula | code | table | diagram | warning | practice | sources",
      "title": "Card Title",
      "content": "Detailed content string with Markdown",
      "items": ["list items"],
      "code": "raw code string if code",
      "language": "language name if code",
      "headers": ["header columns if table"],
      "rows": [["row cells if table"]]
    }
  ]
}

Focus particularly on the user's requested mode: "${options.mode || "all-in-one"}". Ensure the section related to this mode is exceptionally detailed, while still providing complete information for all other sections.`;
  }

  // Prepare prompt text
  let userPrompt = options.prompt;
  if (options.mode !== "chat") {
    if (options.mode === "research" || userPrompt.toLowerCase().includes("research")) {
      userPrompt += `\n\n[Focus Mode: RESEARCH]
Please generate a fully detailed "One-Page Visual Paper Summary" on the topic of the query.
Make sure you populate the "research_paper" object in rich detail matching these exact sections:
1. citation: Full academic citation
2. why_reading: Short line on context/relevance
3. takeaway: Single sentence summary of the paper's contribution
4. background: Prior limitations and question being addressed
5. methodology_text: Detailed method explanation
6. methodology_diagram_desc: Explanation of the method/pipeline flowchart
7. results_text: Headline results and numeric/qualitative findings
8. results_chart_desc: Visual representation description of results plot
9. sketch_desc: Graphical abstract or logic sketch concept
10. limitations: Caveats, constraints, or challenges faced
11. interpretation: Personal interpretation on how it connects to projects
12. glossary: 3-5 key terms and definitions
13. cues: 3-5 quick-recall Q&A self-test questions (like Cornell cues)`;
    } else if (options.mode === "hackathon" || userPrompt.toLowerCase().includes("hackathon") || userPrompt.toLowerCase().includes("project") || userPrompt.toLowerCase().includes("guide me step by step for")) {
      userPrompt += `\n\n[Focus Mode: HACKATHON]
Please generate a highly structured, visual Hackathon/Project framework on the topic.
Make sure you populate the "hackathon_mode" object in rich detail:
- problem: Restate the problem in simple language.
- users: Identify who has the problem.
- objective: Define the exact outcome.
- proposed_solution: Explain the solution.
- features: Separate must_have, nice_to_have, future features.
- architecture: Visual logic frontend -> backend -> database -> external -> deployment.
- tech_stack: List of items containing tech, purpose, free_tier, alternatives.
- data_sources: Data required, origin, formatting.
- database_design: Array of tables with fields and relationships.
- apis: Endpoints with inputs, outputs, and purposes.
- ui_flow: Page-by-page screens and user flow description.
- implementation_phases: Chronological phases and details.
- exact_steps: Detailed step-by-step implementation.
- deployment: Hosting, environment variables, build scripts.
- testing: Edge-case tests, demo tests.
- demo_script: 2-5 min judge-friendly demo script.
- judge_q_and_a: 3-5 predicted difficult judge questions and answers.
- limitations: Technical constraints or simulated components.
- future_scope: Next-stage improvements.`;
    } else if (options.mode === "study_notes" || userPrompt.toLowerCase().includes("study notes") || userPrompt.toLowerCase().includes("explain")) {
      userPrompt += `\n\n[Focus Mode: STUDY NOTES]
Please populate the "study_notes_mode" object in rich detail:
- definition: One exam-ready definition.
- in_simple_words: Simple language analogy/explanation.
- why_it_matters: Purpose, use, context.
- core_concepts: Terms and relationships.
- formula_law: Formula, symbols, units.
- derivation: Step-by-step math derivation.
- solved_sum: A worked numerical example (given, formula, substitution, calculation, answer, unit).
- example: Real-world practical application.
- diagram_table: Comparative table or layout.
- common_mistakes: 3-5 common beginner mistakes and avoidances.
- memory_trick: Mnemonic or mnemonic association.
- exam_questions: Marks (2/5/10), questions, and answers.
- revision_30s: Ultra-short recap.`;
    } else if (options.mode === "math" || userPrompt.toLowerCase().includes("solve") || userPrompt.toLowerCase().includes("calculate")) {
      userPrompt += `\n\n[Focus Mode: MATH / NUMERICAL]
Please populate the "math_mode" object with a step-by-step calculation:
- given: List of known values.
- to_find: Unknown value.
- formula: Formula being applied.
- substitution: Replacing symbols with values.
- calculation: Arithmetic steps.
- answer: Final value and units.
- check: Verification reasoning.`;
    } else if (options.mode === "coding" || userPrompt.toLowerCase().includes("code") || userPrompt.toLowerCase().includes("program") || userPrompt.toLowerCase().includes("syntax")) {
      userPrompt += `\n\n[Focus Mode: CODING]
Please populate the "coding_mode" object:
- language: Program language.
- purpose: Code goal.
- code: Readable source code block.
- explanation: Line-by-line block purposes.
- syntax: Special syntax explanations.
- flow: Processing flow description.
- output: Expected output.
- errors: Logic or syntax bugs identified.
- improved_version: Refactored clean code.
- practice: A similar practice task for learners.`;
    } else if (options.mode === "how_to" || userPrompt.toLowerCase().includes("how to") || userPrompt.toLowerCase().includes("guide")) {
      userPrompt += `\n\n[Focus Mode: HOW-TO]
Please populate the "how_to_mode" object:
- step_0_prerequisites: Tools or libraries needed.
- steps: Array of numbered steps containing step_num, title, action, and why it is done.
- step_5_troubleshoot: Troubleshooting guide.
- step_6_finish: Expected final state.
- checklist: Verification checkboxes list.`;
    } else if (options.mode === "comparison" || userPrompt.toLowerCase().includes("compare") || userPrompt.toLowerCase().includes("versus") || userPrompt.toLowerCase().includes("vs")) {
      userPrompt += `\n\n[Focus Mode: COMPARISON]
Please populate the "comparison_mode" object:
- comparison_table: Array of criterion, option_a, option_b, and best_for.
- verdict: Final recommendation verdict.`;
    } else if (options.mode === "dsa" || userPrompt.toLowerCase().includes("dsa") || userPrompt.toLowerCase().includes("binary search") || userPrompt.toLowerCase().includes("algorithm")) {
      userPrompt += `\n\n[Focus Mode: DSA]
Please populate the "dsa_mode" object in rich detail:
- introduction: General context summary.
- definition: Clean technical definition of the concept/algorithm.
- why_used: Core benefits and advantages.
- when_to_use: Scenarios where it is appropriate.
- prerequisite: Core knowledge requirements.
- how_it_works: Step-by-step logical breakdown.
- visual_explanation: ASCII-art style text visual representation.
- algorithm: Pseudocode logic algorithm.
- pseudocode: Clean pseudocode.
- code: Implementation in code (preferably Python or Java).
- explanation: Line-by-line code explanation.
- example: Real-world example scenario.
- dry_run: Dry-run walkthrough trace.
- time_complexity: Time complexity analysis (best/average/worst).
- space_complexity: Space complexity analysis.
- common_mistakes: 3-5 common implementation mistakes.
- interview_questions: Predicted technical interview questions and answers.
- practice_problems: Checklist of Easy, Medium, Hard problems.
- quick_revision: Quick final recap points.`;
    } else if (options.mode === "business" || userPrompt.toLowerCase().includes("business") || userPrompt.toLowerCase().includes("startup") || userPrompt.toLowerCase().includes("revenue")) {
      userPrompt += `\n\n[Focus Mode: BUSINESS]
Please populate the "business_mode" object in rich detail:
- problem: The market paint-point being solved.
- customer: Ideal customer profile/target persona.
- market: TAM, SAM, SOM scale overview.
- competitors: Direct and indirect competitor landscape.
- differentiation: Unique value proposition.
- business_model: Monetization and operations outline.
- pricing: Pricing tiers strategy.
- marketing: Customer acquisition and growth channels.
- distribution: Logistics and supply chain channels.
- costs: Key fixed and variable cost drivers.
- revenue_model: Stream of cash flow parameters.
- risks: Top risks and threats to mitigation.
- mvp: Minimum Viable Product definition.
- validation_plan: Validation tests and customer feedback loop.`;
    } else if (options.mode === "career" || userPrompt.toLowerCase().includes("career") || userPrompt.toLowerCase().includes("resume") || userPrompt.toLowerCase().includes("cv") || userPrompt.toLowerCase().includes("lpa") || userPrompt.toLowerCase().includes("job") || userPrompt.toLowerCase().includes("roadmap")) {
      userPrompt += `\n\n[Focus Mode: CAREER & RESUME BUILDER]
Please populate the "career_mode" object in rich detail:
- current_level: Skills baseline.
- target: Desired role goal.
- skill_gap: Topics to learn/master.
- roadmap: Detailed timeline milestones.
- daily_schedule: Hour-by-hour target.
- dsa_plan: Key algorithms practice.
- projects: Top projects to build.
- resume: Full-length, ready-to-use, professional ATS-optimized Markdown resume (Contact Header, High-Impact Summary, Categorized Technical Skills, Work Experience with Action Verbs + Quantifiable Metrics, Key Projects, Education, and ATS optimization advice).
- github: Open-source strategy.
- linkedin: Network growth actions.
- interview_preparation: Prep steps list.
- mock_interviews: Drill checklists.
- progress_tracking: Tracking parameters.`;
    } else if (options.mode) {
      userPrompt += `\n\n[Focus Mode: ${options.mode.toUpperCase()}]`;
    }
  }

  // DISPATCH TO OPENROUTER IF USER SELECTED A NON-GEMINI MODEL OR LACKS DIRECT GEMINI KEY
  const isClaudeOrGpt = model.includes("claude") || model.includes("gpt") || model.includes("oss") || model.includes("free") || model.includes("router");
  const isDirectGeminiKeyValid = !!(apiKey && (apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.")));
  
  if (isClaudeOrGpt && !openRouterKey) {
    throw new Error("Claude, GPT-OSS, and Free OpenRouter models require OPENROUTER_API_KEY to be configured in your environment.");
  }

  if (openRouterKey && (isClaudeOrGpt || !isDirectGeminiKeyValid)) {
    if (options.pdf) {
      userPrompt = `[PDF ATTACHMENT ERROR: The selected OpenRouter model does not support binary PDF parsing. Please inform the user clearly that you couldn't process the PDF file due to provider restrictions, and guide them to use a Gemini model or paste the text content directly.]\n\n${userPrompt}`;
    }
    // Map Gemini models to OpenRouter identifiers
    let mappedModel = "google/gemini-2.5-flash";
    if (model.includes("pro") || model.includes("gemini-2.5-pro")) {
      mappedModel = "google/gemini-2.5-pro";
    } else if (model.includes("flash") || model.includes("gemini-2.5-flash")) {
      mappedModel = "google/gemini-2.5-flash";
    } else if (model.includes("claude-sonnet") || model.includes("claude")) {
      mappedModel = "anthropic/claude-3.5-sonnet";
    } else if (model.includes("claude-opus")) {
      mappedModel = "anthropic/claude-3-opus";
    } else if (model.includes("gpt-4o") || model.includes("gpt")) {
      mappedModel = "openai/gpt-4o";
    } else if (model.includes("free") || model.includes("llama")) {
      mappedModel = "meta-llama/llama-3.3-70b-instruct:free";
    } else if (model.includes("ox-alpha")) {
      mappedModel = "openai/gpt-4o";
    } else {
      mappedModel = model;
    }

    const messages: any[] = [
      { role: "system", content: systemInstruction }
    ];

    if (options.history && options.history.length > 0) {
      const recentHistory = options.history.slice(-10);
      for (const h of recentHistory) {
        let cleanContent = h.content;
        if (h.role === "assistant") {
          try {
            const parsed = JSON.parse(h.content);
            if (options.mode === "chat") {
              if (parsed.coding_mode) {
                cleanContent = parsed.coding_mode.purpose || "";
              } else {
                cleanContent = parsed.normal_solution || parsed.quick_answer || h.content;
              }
            } else {
              cleanContent = parsed.normal_solution || parsed.quick_answer || h.content;
            }
          } catch {
            cleanContent = h.content;
          }
        }
        messages.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: cleanContent
        });
      }
    }

    if (options.image) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${options.image.mimeType};base64,${options.image.data}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: userPrompt
      });
    }

    const payload: any = {
      model: mappedModel,
      messages,
      max_tokens: 1500
    };

    if (options.mode !== "chat") {
      payload.response_format = { type: "json_object" };
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://quicksolv.edu",
          "X-Title": "QuickSolv AI"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API returned error ${response.status}`, errorText);
        throw new Error(`OpenRouter API returned status ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      const responseText = responseData.choices?.[0]?.message?.content;

      if (!responseText) {
        throw new Error("OpenRouter returned an empty response.");
      }

      if (options.mode === "chat") {
        const promptTopic = options.prompt
          ? options.prompt.trim().split(/\s+/).slice(0, 5).join(" ")
          : "General Topic";
        const formattedTopic = promptTopic.charAt(0).toUpperCase() + promptTopic.slice(1);

        return {
          subject: "General",
          topic: formattedTopic,
          difficulty: "Easy",
          quick_answer: responseText,
          easy_explanation: responseText,
          normal_solution: responseText,
          formulas: [],
          examples: [],
          exam_answer: {},
          memory_trick: "",
          common_mistakes: [],
          important_points: [],
          quiz: [],
          confidence: "High"
        };
      }

      let parsedResult: GeminiStudyResponse;
      try {
        const startIdx = responseText.indexOf("{");
        const endIdx = responseText.lastIndexOf("}");
        if (startIdx === -1 || endIdx === -1) {
          throw new Error("No JSON object found in response");
        }
        const jsonStr = responseText.substring(startIdx, endIdx + 1);
        const cleanedStr = cleanJsonResponse(jsonStr);
        parsedResult = JSON.parse(cleanedStr);
      } catch (parseErr) {
        console.error("Failed to parse OpenRouter JSON output. Raw output was:", responseText);
        throw new Error("The tutor's answer format was invalid. Please try again.");
      }

      return parsedResult;
    } catch (err: any) {
      console.error("OpenRouter API call failed:", err);
      throw err;
    }
  }

  // NATIVE GEMINI API FALLBACK
  if (!isDirectGeminiKeyValid) {
    throw new Error("Invalid or missing Google Gemini API Key. Google Gemini keys must start with 'AIzaSy'. Please configure a valid key or use OpenRouter.");
  }
  
  const googleCandidates = Array.from(new Set([
    "gemini-3.6-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ]));

  // Construct contents payload
  const parts: any[] = [];

  // Add media parts if provided
  if (options.image) {
    const resolution = options.image.highResolution ? "MEDIA_RESOLUTION_HIGH" : "MEDIA_RESOLUTION_LOW";
    parts.push({
      inlineData: {
        mimeType: options.image.mimeType,
        data: options.image.data
      },
      mediaResolution: resolution
    });
  }

  if (options.pdf) {
    parts.push({
      inlineData: {
        mimeType: options.pdf.mimeType,
        data: options.pdf.data
      }
    });
  }

  // Add textual prompt
  parts.push({ text: userPrompt });

  const contents: any[] = [];

  if (options.history && options.history.length > 0) {
    const recentHistory = options.history.slice(-10);
    for (const h of recentHistory) {
      let cleanContent = h.content;
      if (h.role === "assistant") {
        try {
          const parsed = JSON.parse(h.content);
          if (options.mode === "chat") {
            if (parsed.coding_mode) {
              cleanContent = parsed.coding_mode.purpose || "";
            } else {
              cleanContent = parsed.normal_solution || parsed.quick_answer || h.content;
            }
          } else {
            cleanContent = parsed.normal_solution || parsed.quick_answer || h.content;
          }
        } catch {
          cleanContent = h.content;
        }
      }
      contents.push({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: cleanContent }]
      });
    }
  }

  contents.push({
    role: "user",
    parts: parts
  });

  // Request payload
  const payload: any = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      // If we aren't using search grounding, enforce JSON schema API constraint.
      // If we are using search grounding, we don't enforce it at the API level (it can conflict)
      // but rely on prompt instructions.
      responseMimeType: "application/json"
    }
  };

  if (options.mode === "chat") {
    delete payload.generationConfig.responseMimeType;
  }

  // Add search grounding tools if selected
  if (options.searchGrounding) {
    payload.tools = [{ googleSearch: {} }];
    // Disable strict responseMimeType because search grounding + strict responseMimeType JSON schema is not fully supported on some legacy endpoints/models
    delete payload.generationConfig.responseMimeType;
  }

  let lastGoogleErr: any = null;
  for (const activeGoogleModel of googleCandidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeGoogleModel}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini model '${activeGoogleModel}' returned error ${response.status}:`, errorText);
        lastGoogleErr = new Error(`Gemini status ${response.status}: ${errorText}`);
        continue;
      }

      const responseData = await response.json();
      const candidate = responseData.candidates?.[0];
      const responseText = candidate?.content?.parts?.[0]?.text;

      if (!responseText) {
        continue;
      }

      if (options.mode === "chat") {
        const promptTopic = options.prompt
          ? options.prompt.trim().split(/\s+/).slice(0, 5).join(" ")
          : "General Topic";
        const formattedTopic = promptTopic.charAt(0).toUpperCase() + promptTopic.slice(1);

        return {
          subject: "General",
          topic: formattedTopic,
          difficulty: "Easy",
          quick_answer: responseText,
          easy_explanation: responseText,
          normal_solution: responseText,
          formulas: [],
          examples: [],
          exam_answer: {},
          memory_trick: "",
          common_mistakes: [],
          important_points: [],
          quiz: [],
          confidence: "High"
        };
      }

      let parsedResult: GeminiStudyResponse;
      try {
        const startIdx = responseText.indexOf("{");
        const endIdx = responseText.lastIndexOf("}");
        if (startIdx === -1 || endIdx === -1) {
          throw new Error("No JSON object found in response");
        }
        const jsonStr = responseText.substring(startIdx, endIdx + 1);
        const cleanedStr = cleanJsonResponse(jsonStr);
        parsedResult = JSON.parse(cleanedStr);
      } catch (parseErr) {
        console.error("Failed to parse Gemini JSON output. Raw output was:", responseText);
        throw new Error("The tutor's answer format was invalid. Please try again.");
      }

      return parsedResult;
    } catch (err: any) {
      console.warn(`Direct Gemini attempt with '${activeGoogleModel}' failed:`, err);
      lastGoogleErr = err;
    }
  }

  throw lastGoogleErr || new Error("All direct Gemini model attempts failed.");
}

/**
 * A lightweight function to get unstructured plain-text/markdown content from Gemini.
 * Perfect for summaries, simple explanations, or non-JSON flows.
 */
export async function generateRawGeminiText(prompt: string, modelOverride?: string, userGeminiKey?: string, userOpenRouterKey?: string): Promise<string> {
  const apiKey = userGeminiKey || process.env.GEMINI_API_KEY;
  const openRouterKey = userOpenRouterKey || process.env.OX_ALPHA_API_KEY || process.env.OPENROUTER_API_KEY;

  if (modelOverride === "ox-alpha" || (!apiKey && openRouterKey)) {
    const { generateRawOxAlphaText } = await import("./oxalpha");
    return await generateRawOxAlphaText(prompt, openRouterKey);
  }

  if (!apiKey && !openRouterKey) {
    throw new Error("API Keys are missing. Please configure GEMINI_API_KEY or OX_ALPHA_API_KEY.");
  }

  const DEFAULT_MODEL = "gemini-3.1-flash-lite";
  const model = modelOverride || DEFAULT_MODEL;

  // OpenRouter flow
  if (openRouterKey && !apiKey) {
    let mappedModel = "google/gemini-2.5-flash";
    if (model.includes("pro")) {
      mappedModel = "google/gemini-2.5-pro";
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://quicksolv.edu",
          "X-Title": "QuickSolv AI"
        },
        body: JSON.stringify({
          model: mappedModel,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter returned status ${response.status}`);
      }

      const responseData = await response.json();
      return responseData.choices?.[0]?.message?.content || "";
    } catch (err: any) {
      console.error("OpenRouter raw text call failed:", err);
      throw err;
    }
  }

  // Native Gemini flow
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const responseData = await response.json();
    return responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err: any) {
    console.error("Native Gemini raw text call failed:", err);
    throw err;
  }
}

export async function generateGeminiContentStream(
  options: GeminiOptions,
  signal?: AbortSignal,
  onChunk?: (text: string) => void
): Promise<string> {
  const apiKey = options.userGeminiKey || process.env.GEMINI_API_KEY;
  const openRouterKey = options.userOpenRouterKey || process.env.OX_ALPHA_API_KEY || process.env.OPENROUTER_API_KEY;
  const model = options.modelOverride || "ox-alpha";
  
  const isClaudeOrGpt = model.includes("claude") || model.includes("gpt") || model.includes("ox-alpha") || model.includes("oss") || model.includes("free") || model.includes("router");
  const isDirectGeminiKeyValid = !!(apiKey && (apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.")));

  if (!openRouterKey && !isDirectGeminiKeyValid) {
    throw new Error("API Keys are missing. Please configure a valid OxAlpha API key or Google Gemini key.");
  }

  const systemInstruction = buildQuickSolvSystemInstruction(options);

  // Helper for Direct Gemini Stream
  const runDirectGeminiStream = async (): Promise<string> => {
    const googleCandidates = Array.from(new Set([
      model.includes("pro") ? "gemini-1.5-pro" : "gemini-3.6-flash",
      "gemini-3.6-flash",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro"
    ]));

    const contents: any[] = [];
    if (options.history && options.history.length > 0) {
      const recentHistory = options.history.slice(-8);
      for (const h of recentHistory) {
        let cleanContent = h.content;
        if (h.role === "assistant") {
          try {
            const parsed = JSON.parse(h.content);
            cleanContent = parsed.normal_solution || parsed.quick_answer || h.content;
          } catch {
            cleanContent = h.content;
          }
        }
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: cleanContent }]
        });
      }
    }

    const parts: any[] = [];
    if (options.image) {
      parts.push({
        inlineData: {
          mimeType: options.image.mimeType,
          data: options.image.data
        }
      });
    }
    if (options.pdf) {
      parts.push({
        inlineData: {
          mimeType: options.pdf.mimeType,
          data: options.pdf.data
        }
      });
    }
    parts.push({ text: options.prompt });
    contents.push({ role: "user", parts });

    let lastErr: any = null;
    for (const activeGoogleModel of googleCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeGoogleModel}:streamGenerateContent?key=${apiKey}`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemInstruction }] }
          }),
          signal: signal || undefined
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`Direct Gemini model '${activeGoogleModel}' failed status ${response.status}:`, errText);
          lastErr = new Error(`Gemini streaming API status ${response.status}: ${errText}`);
          continue;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Gemini stream body is not readable.");

        const decoder = new TextDecoder();
        let accumulatedText = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let openBrackets = 0;
            let startIdx = -1;
            
            for (let i = 0; i < buffer.length; i++) {
              const char = buffer[i];
              if (char === "{") {
                if (openBrackets === 0) startIdx = i;
                openBrackets++;
              } else if (char === "}") {
                openBrackets--;
                if (openBrackets === 0 && startIdx !== -1) {
                  const objStr = buffer.substring(startIdx, i + 1);
                  try {
                    const parsed = JSON.parse(objStr);
                    const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (chunkText) {
                      accumulatedText += chunkText;
                      if (onChunk) onChunk(chunkText);
                    }
                  } catch (e) {
                    // ignore parsing on partial structures
                  }
                  buffer = buffer.substring(i + 1);
                  i = -1;
                  startIdx = -1;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (accumulatedText) {
          return accumulatedText;
        }
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        console.warn(`Stream attempt with direct model '${activeGoogleModel}' failed:`, err);
        lastErr = err;
      }
    }

    throw lastErr || new Error("All direct Gemini streaming attempts failed.");
  };

  // Helper for OpenRouter Stream
  const runOpenRouterStream = async (): Promise<string> => {
    const messages: any[] = [{ role: "system", content: systemInstruction }];
    
    if (options.history && options.history.length > 0) {
      const recentHistory = options.history.slice(-8);
      for (const h of recentHistory) {
        let cleanContent = h.content;
        if (h.role === "assistant") {
          try {
            const parsed = JSON.parse(h.content);
            cleanContent = parsed.normal_solution || parsed.quick_answer || h.content;
          } catch {
            cleanContent = h.content;
          }
        }
        messages.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: cleanContent
        });
      }
    }
    
    let userPrompt = options.prompt;
    if (options.pdf) {
      userPrompt = `[PDF ATTACHMENT NOTICE: Reading document context directly.]\n\n${userPrompt}`;
    }
    messages.push({ role: "user", content: userPrompt });
    
    let requestedModel = "openai/gpt-4o-mini";
    if (model === "ox-alpha" || model.includes("ox-alpha") || model.includes("gpt")) {
      requestedModel = "openai/gpt-4o-mini";
    } else if (model.includes("pro")) {
      requestedModel = "google/gemini-2.5-pro";
    } else if (model.includes("claude-sonnet") || model.includes("claude")) {
      requestedModel = "anthropic/claude-3.5-sonnet";
    } else {
      requestedModel = model;
    }
    
    const candidateModels = Array.from(new Set([
      requestedModel,
      "openai/gpt-4o-mini",
      "openai/gpt-4o",
      "google/gemini-2.5-flash",
      "anthropic/claude-3.5-sonnet",
      "meta-llama/llama-3.3-70b-instruct"
    ]));
    let lastErrStr = "";

    for (const activeModel of candidateModels) {
      try {
        const payload = {
          model: activeModel,
          messages,
          max_tokens: 2500,
          stream: true
        };
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openRouterKey}`,
            "HTTP-Referer": "https://quicksolv.app",
            "X-Title": "QuickSolv OxAlpha AI"
          },
          body: JSON.stringify(payload),
          signal: signal || undefined
        });
        
        if (!response.ok) {
          const errText = await response.text();
          lastErrStr = `OpenRouter (${activeModel}) status ${response.status}: ${errText}`;
          console.warn(lastErrStr);
          continue;
        }
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable.");
        }
        
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let buffer = "";
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              const cleanedLine = line.trim();
              if (!cleanedLine) continue;
              if (cleanedLine === "data: [DONE]") continue;
              if (cleanedLine.startsWith("data: ")) {
                try {
                  const dataStr = cleanedLine.slice(6);
                  const parsed = JSON.parse(dataStr);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    accumulatedText += content;
                    if (onChunk) onChunk(content);
                  }
                } catch (e) {
                  // ignore JSON parse errors on partial stream lines
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        
        if (accumulatedText) {
          return accumulatedText;
        }
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        console.warn(`Stream attempt with model ${activeModel} failed:`, err);
        lastErrStr = err.message;
      }
    }

    throw new Error(`OpenRouter OxAlpha streaming failed: ${lastErrStr || "All candidate models failed"}`);
  };

  const preferDirectGemini = isDirectGeminiKeyValid && (!openRouterKey || !isClaudeOrGpt);

  if (preferDirectGemini) {
    try {
      return await runDirectGeminiStream();
    } catch (primaryErr) {
      if (openRouterKey) {
        console.warn("Primary Direct Gemini stream failed. Falling back to OpenRouter stream:", primaryErr);
        return await runOpenRouterStream();
      }
      throw primaryErr;
    }
  } else if (openRouterKey) {
    try {
      return await runOpenRouterStream();
    } catch (primaryErr) {
      if (isDirectGeminiKeyValid) {
        console.warn("Primary OpenRouter stream failed. Falling back to Direct Gemini stream:", primaryErr);
        return await runDirectGeminiStream();
      }
      throw primaryErr;
    }
  } else {
    throw new Error("No valid AI provider configuration found.");
  }
}

/**
 * Builds standard system instructions for QuickSolv AI pipeline.
 */
function buildQuickSolvSystemInstruction(options: GeminiOptions): string {
  const analysis = analyzeUserRequest(options.prompt, options.mode, !!options.image, !!options.pdf);
  const name = options.userName || "";
  const greetingPrompt = name
    ? `The user's name is ${name}. If they greet you, respond naturally and warmly by name.`
    : `If the user greets you, respond naturally and warmly.`;

  return `You are QuickSolv, an intelligent, highly versatile, general-purpose AI assistant (comparable to ChatGPT Plus, Claude 3.5 Sonnet, and Gemini 2.5 Pro).

==================================================
CORE PRINCIPLE & DYNAMIC ORCHESTRATION
==================================================
Do NOT use rigid response templates or hardcoded canned formats.
Follow this cognitive process for every user message:
1. Understand the user's actual intent, conversation context, and goal.
2. Determine what type of assistance is genuinely needed.
3. Dynamically choose the best response strategy and format.
4. Generate a highly useful, accurate, human-like response.
5. Perform internal Response Verification before outputting.

USER INTENT ANALYSIS:
- Detected Intent: ${analysis.intent}
- Requested Depth: ${analysis.depth}
- Language Style: ${analysis.userStyle}

==================================================
1. NATURAL CONVERSATIONAL VARIATION (NO ROBOTIC CLICHÉS)
==================================================
- ${greetingPrompt}
- VARY YOUR WORDING NATURALLY. For casual messages ("Hi", "Hey", "What's up"), respond in a warm, varied, natural human tone (e.g., "Hey! 👋 How's your day going?", "Hello! What are you working on today?", "Hey! What's up?"). Never repeat identical canned greetings.
- ROBOTIC CLICHÉ BAN: NEVER mechanically use phrases like:
  "Certainly!", "Absolutely!", "Sure!", "I'd be happy to help!", "Here is a comprehensive guide...", "Let's dive in...", "Let's break it down...", "That's a great question!", "Feel free to ask!".
- Speak naturally and directly like a knowledgeable, human-like mentor.

==================================================
2. DYNAMIC RESPONSE FORMAT SELECTION
==================================================
Select the structure that BEST solves the user's specific request:
- Casual Chat / Personal Dilemma: Direct, conversational, practical, and empathetic. NOT an automated essay or motivational speech.
- Simple / Concise Question: Short, direct answer in 1 to 3 paragraphs. Do not force complex diagrams, nested tables, or 20 bullet points.
- Programming & Coding:
  1. Brief explanation of approach.
  2. COMPLETE, clean, working, executable code (Zero shortcuts like 'TODO' or '...').
  3. Include Sample Input and Expected Output (clearly labeled Expected Output vs Verified Output).
  4. Explain key parts and mention Time & Space complexity when useful.
  5. Never invent non-existent APIs or libraries.
- Mathematics:
  - Simple calculations: Direct calculation and result without bloated essays.
  - Complex / step-by-step math: Formula -> Substitution -> Calculation -> Final Answer.
- Exam Preparation: Definition -> Key Points -> Relevant Formulas/Examples -> Exam-Ready Answer.
- Research Requests: Structure appropriately (Title, Abstract/Intro, Background, Analysis, Findings, Discussion, Limitations, Conclusion). NEVER invent fake citations, papers, or statistics.
- Resume & CV Generation (CRITICAL RESUME ANTI-FABRICATION RULE):
  - NEVER invent a fake candidate's name, email, phone, university, companies, job experience, or credentials!
  - If the user says "Create my resume" or "Build my resume" and key personal details (name, experience, skills, education, contact info) are missing: ASK FOR THE NECESSARY INFORMATION DIRECTLY.
  - If partial info is provided: Create the resume using ONLY the provided information.
  - If explicitly asked for a generic example (e.g. "Show me an example software engineer resume"): Label it clearly at the top: "Example Resume — Fictional Content".
- Comparison Requests: Structured comparison table + clear recommendation verdict.
- Troubleshooting / Debugging: Identify root cause -> Corrected code/steps -> Explanation -> Verification.

==================================================
3. CONVERSATION CONTEXT & MULTI-TURN MEMORY
==================================================
- Maintain conversation context across turns (e.g., if user says "I'm learning Java", then "Explain inheritance", then "Give me an example", then "Now give me a program", know that "program" refers to Java inheritance!).
- Only refer to previous context if relevant to the current request.
- Keep user data completely isolated per conversation session.

==================================================
4. SCREENSHOT / IMAGE / DOCUMENT ANALYSIS
==================================================
- Actually inspect the provided image/document content. Solve the exact problem, analyze the exact code, or identify the exact error shown.
- If content is unreadable or blurry, explicitly state what is unclear instead of guessing.

==================================================
5. INTERNAL RESPONSE SELF-CHECK (VERIFICATION PROTOCOL)
==================================================
Before outputting your response, internally verify:
A. Did I understand the user's actual goal?
B. Did I answer the exact request directly?
C. Did I avoid inventing facts, credentials, or citations?
D. Is the format dynamically suited to the prompt (not forced into a rigid template)?
E. Is code complete and functional?
F. Did I avoid robotic clichés?`;
}

