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

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

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
    systemInstruction = `You are QuickSolv, a world-class, premium AI assistant designed with elite reasoning, deep analysis, and natural human communication capabilities (comparable to ChatGPT, Claude-3.5-Sonnet, Gemini-2.5-Pro, and Cursor).
Respond directly to the user in a natural, conversational, realistic human-like manner. Do NOT output JSON. Respond in plain, flowing conversational markdown text directly.

${greetingPrompt}

CRITICAL: ADAPT YOUR RESPONSE DEPTH AND FORMAT DYNAMICALLY
- Simple/concise questions (e.g., "What is Python?", "2 + 2", "What is Full Stack Development?") -> Respond with a direct, concise explanation of 1 to 3 paragraphs. Do not generate long analogies, nested tables, project blueprints, or list 20 technologies.
- "Explain ... in detail" or complex architectural questions -> Provide a moderate-to-detailed structured explanation covering core aspects.
- "Teach me ... from zero" or tutorial requests -> Provide a structured, milestone-based learning roadmap/course.
- Practical implementation requests (e.g., "How do I build ...") -> Provide step-by-step guidance on frontend, backend, database, and deployment.

CONTEXT SELECTION RULE:
- Maintain conversation memory, but ONLY refer to previous context (like a user's project "Fixora") if the current query explicitly mentions it or is clearly a direct continuation of it (e.g. "What features should I add?").
- If the user asks a general-purpose question (e.g., "What is recursion?", "What is Full Stack Development?"), explain it normally and generally. Do NOT force a connection to their previous project (like Fixora) unless they explicitly ask for it.

ROBOTIC PHRASE AVOIDANCE:
- Avoid robotic or repetitive transitional phrases such as "Let's break it down...", "Think of it like...", "Let's dive deeper...", "That's an excellent question...", "Absolutely!", "For your Fixora project...", "Feel free to ask...". Speak with natural human variation.
- Do not automatically inject metaphors or analogies (like house/restaurant analogies) for every concept unless it is highly obscure and genuinely benefits from it. A clear, straightforward explanation is always preferred.

Use clean Markdown formatting, bolding, code blocks, lists, and LaTeX math notation (\\(...\\), \\([...\\]) only when they naturally enhance readability.`;
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
    systemInstruction = `You are QuickSolv, a world-class, premium AI model designed with elite reasoning, deep analysis, and natural human communication capabilities (comparable to ChatGPT, Claude-3.5-Sonnet, Gemini-2.5-Pro, and Cursor).
The user's name is ${name}. If they greet you, greet them by their name.
Your answers must be highly conversational, extremely detailed, fully comprehensive, and custom-tailored to the user's specific query.
Never repeat identical structures or generic templates across different responses. Personalize every conversation dynamically, making it feel authentic, fluid, and uniquely human.

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
    "tech_stack": "Comparison details",
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
    "output": "Console outcome",
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
    "resume": "Resume improvement layout",
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
    } else if (options.mode === "career" || userPrompt.toLowerCase().includes("career") || userPrompt.toLowerCase().includes("lpa") || userPrompt.toLowerCase().includes("job") || userPrompt.toLowerCase().includes("roadmap")) {
      userPrompt += `\n\n[Focus Mode: CAREER]
Please populate the "career_mode" object in rich detail:
- current_level: Skills baseline.
- target: Desired role goal.
- skill_gap: Topics to learn/master.
- roadmap: Detailed timeline milestones.
- daily_schedule: Hour-by-hour target.
- dsa_plan: Key algorithms practice.
- projects: Top projects to build.
- resume: Resume improvement advice.
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
    if (model.includes("gemini-3.6-flash")) {
      mappedModel = "google/gemini-2.5-flash";
    } else if (model.includes("gemini-3.5-flash")) {
      mappedModel = "google/gemini-2.5-flash";
    } else if (model.includes("gemini-3.1-pro")) {
      mappedModel = "google/gemini-2.5-pro";
    } else if (model.includes("claude-sonnet")) {
      mappedModel = "anthropic/claude-3.5-sonnet";
    } else if (model.includes("claude-opus")) {
      mappedModel = "anthropic/claude-3-opus";
    } else if (model.includes("nvidia-nemotron-3-ultra-free")) {
      mappedModel = "nvidia/nemotron-3-ultra-550b-a55b:free";
    } else if (model.includes("gemma-4-31b-free")) {
      mappedModel = "google/gemma-2-9b-it:free";
    } else if (model.includes("free-models-router")) {
      mappedModel = "openrouter/auto";
    } else if (model.includes("gpt-oss-20b-free")) {
      mappedModel = "meta-llama/llama-3-8b-instruct:free";
    } else if (model.includes("gpt-oss")) {
      mappedModel = "meta-llama/llama-3.1-405b-instruct";
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
      max_tokens: 6000
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
    throw new Error("Invalid or missing Google Gemini API Key. Google Gemini keys must start with 'AIzaSy' or 'AQ.'. Please configure a valid key or use OpenRouter.");
  }
  let activeGoogleModel = "gemini-3.6-flash";
  if (model.includes("pro")) {
    activeGoogleModel = "gemini-3.1-pro-preview";
  } else if (model.includes("gemini-3.6-flash")) {
    activeGoogleModel = "gemini-3.6-flash";
  } else if (model.includes("gemini-3.5-flash")) {
    activeGoogleModel = "gemini-3.5-flash";
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeGoogleModel}:generateContent?key=${apiKey}`;

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
      console.error(`Gemini API returned error ${response.status}`, errorText);
      throw new Error(`Gemini API returned status ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // Extract candidate text
    const candidate = responseData.candidates?.[0];
    const responseText = candidate?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Gemini returned an empty response.");
    }

    if (options.mode === "chat") {
      const promptTopic = options.prompt
        ? options.prompt.trim().split(/\s+/).slice(0, 5).join(" ")
        : "General Topic";
      const formattedTopic = promptTopic.charAt(0).toUpperCase() + promptTopic.slice(1);

      let parsedResult: GeminiStudyResponse = {
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

      if (candidate?.groundingMetadata) {
        const metadata = candidate.groundingMetadata;
        const chunks = metadata.groundingChunks || [];
        const sources = chunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title || "Web Source",
            url: chunk.web.uri || ""
          }));
        parsedResult.sources = sources;
      }

      return parsedResult;
    }

    // Try to parse the JSON output
    let parsedResult: GeminiStudyResponse;
    try {
      // Find the first '{' and last '}' to strip markdown formatting if any
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

    // Extract search grounding metadata if present
    if (candidate?.groundingMetadata) {
      const metadata = candidate.groundingMetadata;
      const chunks = metadata.groundingChunks || [];
      const sources = chunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title || "Web Source",
          url: chunk.web.uri || ""
        }));

      parsedResult.sources = sources;
      parsedResult.research_findings = parsedResult.quick_answer || parsedResult.easy_explanation;
    }

    return parsedResult;
  } catch (err: any) {
    console.error("Gemini API call failed:", err);
    throw err;
  }
}

/**
 * A lightweight function to get unstructured plain-text/markdown content from Gemini.
 * Perfect for summaries, simple explanations, or non-JSON flows.
 */
export async function generateRawGeminiText(prompt: string, modelOverride?: string, userGeminiKey?: string, userOpenRouterKey?: string): Promise<string> {
  const apiKey = userGeminiKey || process.env.GEMINI_API_KEY;
  const openRouterKey = userOpenRouterKey || process.env.OPENROUTER_API_KEY;

  if (!apiKey && !openRouterKey) {
    throw new Error("API Keys are missing. Please configure GEMINI_API_KEY or OPENROUTER_API_KEY.");
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
          messages: [{ role: "user", content: prompt }]
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
  signal: AbortSignal,
  onChunk: (text: string) => void
): Promise<string> {
  const apiKey = options.userGeminiKey || process.env.GEMINI_API_KEY;
  const openRouterKey = options.userOpenRouterKey || process.env.OPENROUTER_API_KEY;
  const model = options.modelOverride || "nvidia-nemotron-3-ultra-free";
  
  const isClaudeOrGpt = model.includes("claude") || model.includes("gpt") || model.includes("oss") || model.includes("free") || model.includes("router");
  const isDirectGeminiKeyValid = !!(apiKey && (apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.")));

  if (!openRouterKey && !isDirectGeminiKeyValid) {
    throw new Error("API Keys are missing. Please configure a valid Google Gemini key (starting with AIzaSy or AQ.) or OpenRouter key.");
  }

  const systemInstruction = buildQuickSolvSystemInstruction(options);

  // Helper for Direct Gemini Stream
  const runDirectGeminiStream = async (): Promise<string> => {
    let activeGoogleModel = "gemini-3.6-flash";
    if (model.includes("pro")) {
      activeGoogleModel = "gemini-3.1-pro-preview";
    } else if (model.includes("gemini-3.6-flash")) {
      activeGoogleModel = "gemini-3.6-flash";
    } else if (model.includes("gemini-3.5-flash")) {
      activeGoogleModel = "gemini-3.5-flash";
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeGoogleModel}:streamGenerateContent?key=${apiKey}`;

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

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] }
      }),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini streaming API returned status ${response.status}: ${errText}`);
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
                  onChunk(chunkText);
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

    return accumulatedText;
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
    
    let mappedModel = "google/gemini-2.5-flash";
    if (model.includes("pro")) {
      mappedModel = "google/gemini-2.5-pro";
    } else if (model.includes("claude-sonnet")) {
      mappedModel = "anthropic/claude-3.5-sonnet";
    } else if (model.includes("nvidia-nemotron-3-ultra-free")) {
      mappedModel = "nvidia/nemotron-3-ultra-550b-a55b:free";
    } else if (model.includes("gemma-4-31b-free")) {
      mappedModel = "google/gemma-2-9b-it:free";
    } else if (model.includes("free-models-router")) {
      mappedModel = "openrouter/auto";
    } else if (model.includes("gpt-oss-20b-free")) {
      mappedModel = "meta-llama/llama-3-8b-instruct:free";
    } else {
      mappedModel = model;
    }
    
    const payload = {
      model: mappedModel,
      messages,
      max_tokens: 4000,
      stream: true
    };
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openRouterKey}`,
        "HTTP-Referer": "https://quicksolv.edu",
        "X-Title": "QuickSolv AI"
      },
      body: JSON.stringify(payload),
      signal
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter returned status ${response.status}: ${errText}`);
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
                onChunk(content);
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
    
    return accumulatedText;
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
    ? `The user's name is ${name}. If they greet you (e.g. say "hi", "hello", "hey"), greet them back warmly and briefly by name (e.g., "Hi ${name}! How can I help you today?"). Do not write an educational study note for a simple greeting.`
    : `If the user greets you (e.g. say "hi", "hello", "hey"), greet them back warmly and briefly (e.g., "Hi! How can I help you today?"). Do not write an educational study note for a simple greeting.`;

  return `You are QuickSolv, a world-class, premium production AI assistant built for high accuracy, deep reasoning, clarity, and flawless execution (comparable to ChatGPT Plus, Claude 3.5 Sonnet, and Gemini 2.5 Pro).

CORE MANDATE:
"Answer EXACTLY what the user asked." Do not generate unrelated information simply because a keyword matched.

USER INTENT CLASSIFICATION:
- Detected Intent: ${analysis.intent}
- Requested Depth: ${analysis.depth}
- Language Style: ${analysis.userStyle}

DYNAMIC RESPONSE STRUCTURE RULES:
- If Depth is SIMPLE: Provide a direct, concise answer in 1 to 3 natural paragraphs. Avoid nested tables, bloated blueprints, or forced long analogies.
- If Depth is MEDIUM: Provide (1) Direct Answer, (2) Concise Explanation, (3) Practical Example (if useful).
- If Depth is COMPLEX: Provide (1) Direct Answer, (2) Comprehensive Explanation, (3) Step-by-Step Reasoning/Solution, (4) Practical Examples, (5) Key Takeaways/Points, (6) Practical Application, (7) Summary.

INTENT-SPECIFIC FORMATTING GUIDELINES:
- LEARNING MODE: Definition -> Simple explanation -> Why it matters -> How it works -> Example -> Key points -> Quick revision.
- STEP-BY-STEP SOLUTIONS (Math, Physics, Chemistry, Algorithms):
  1. Given Information
  2. What is Required
  3. Relevant Formula / Core Concept
  4. Step-by-Step Calculation or Implementation
  5. Final Answer
  6. Quick Verification Check
- CODING & DEBUGGING MODE:
  1. High-level Explanation of approach / root cause
  2. Complete, clean, executable code (Zero placeholders like 'TODO' or '...')
  3. Important implementation details
  4. Key edge cases
  5. Testing instructions
- RESEARCH MODE: Topic -> Executive Summary -> Background -> Main Findings -> Detailed Analysis -> Important Data -> Pros & Cons -> Examples -> Implications -> Conclusion -> Sources.
- IMAGE ANALYSIS MODE: Carefully examine the image. Identify visible UI elements, error messages, text content, and directly address the user's query. If text or details are unreadable, explicitly state that instead of guessing.
- DOCUMENT / PDF ANALYSIS MODE: Treat the document content as the single source of truth. Preserve source terminology, formulas, and definitions. Never invent unverified details.

COMMUNICATION STYLE & TONE:
- ${greetingPrompt}
- If Language Style is TELUGU_ENGLISH: Respond in natural, helpful Telugu-English mix (Tenglish) where appropriate while keeping technical concepts precise.
- If Language Style is SHORT: Match brevity and avoid overwhelming walls of text.
- ROBOTIC PHRASE AVOIDANCE: Never use robotic clichés like "Let's break it down...", "Think of it like...", "Let me dive deep into...", "That's a great question!", "Feel free to ask!". Speak naturally and directly like an expert mentor.
- Use clean GitHub-flavored Markdown, LaTeX formatting (\\(...\\) for inline, \\([...\\)] for display math), clear code blocks with language identifiers, and bolding for readability.`;
}

