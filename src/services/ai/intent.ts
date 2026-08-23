export type IntentType =
  | "GENERAL"
  | "EXPLAIN"
  | "SOLVE"
  | "LEARN"
  | "STUDY"
  | "RESEARCH"
  | "CODE"
  | "DEBUG"
  | "CREATE"
  | "COMPARE"
  | "SUMMARIZE"
  | "ANALYZE"
  | "PLAN"
  | "CALCULATE"
  | "IMAGE_ANALYSIS"
  | "DOCUMENT_ANALYSIS";

export type ResponseDepth = "SIMPLE" | "MEDIUM" | "COMPLEX";

export type UserLanguageStyle = "ENGLISH_SIMPLE" | "ENGLISH_TECHNICAL" | "TELUGU_ENGLISH" | "SHORT";

export interface IntentAnalysis {
  intent: IntentType;
  depth: ResponseDepth;
  userStyle: UserLanguageStyle;
  needsWebSearch: boolean;
  needsCalculator: boolean;
  needsPatsnap: boolean;
  isFollowUp: boolean;
  followUpSubject?: string;
  detectedTopic?: string;
}

/**
 * Detects whether a prompt is a follow-up query relying on prior context.
 */
function checkIsFollowUp(prompt: string): boolean {
  const p = prompt.trim().toLowerCase();
  const followUpIndicators = [
    "its ", "their ", "these ", "those ", "that ", "this ",
    "give me an example", "give an example", "show an example", "example please",
    "what about", "how about", "more details", "explain more",
    "why is that", "how does it work", "advantages of it", "disadvantages of it",
    "can you rewrite", "fix it", "optimize it", "convert it",
    "tell me more", "summarize it", "what else"
  ];

  return followUpIndicators.some(ind => p.includes(ind)) || p.length < 15;
}

/**
 * Classifies user prompt into specific intent type.
 */
export function classifyIntent(prompt: string, hasImage?: boolean, hasPdf?: boolean): IntentType {
  if (hasImage) return "IMAGE_ANALYSIS";
  if (hasPdf) return "DOCUMENT_ANALYSIS";

  const p = prompt.toLowerCase().trim();

  // Code & Debug
  if (p.includes("debug") || p.includes("fix error") || p.includes("syntax error") || p.includes("stack trace") || p.includes("why is this failing")) {
    return "DEBUG";
  }
  if (
    p.includes("code") || p.includes("function") || p.includes("class") || p.includes("write a script") ||
    p.includes("javascript") || p.includes("python") || p.includes("c++") || p.includes("java") ||
    p.includes("typescript") || p.includes("html") || p.includes("css") || p.includes("react") ||
    p.includes("sql") || p.includes("algorithm") || p.includes("leetcode") || p.includes("dsa")
  ) {
    return "CODE";
  }

  // Calculate & Solve Math
  if (
    p.includes("solve") || p.includes("calculate") || p.includes("integrate") ||
    p.includes("differentiate") || p.includes("equation") || p.includes("eval ") ||
    /^\s*[\d\s+\-*/()^.]+\s*$/.test(prompt)
  ) {
    if (p.includes("step by step") || p.includes("problem") || p.includes("find x") || p.includes("derivative")) {
      return "SOLVE";
    }
    return "CALCULATE";
  }

  // Compare
  if (p.includes("compare") || p.includes("versus") || p.includes("vs") || p.includes("difference between") || p.includes("pros and cons")) {
    return "COMPARE";
  }

  // Summarize
  if (p.includes("summarize") || p.includes("summary") || p.includes("tl;dr") || p.includes("key takeaways")) {
    return "SUMMARIZE";
  }

  // Research
  if (p.includes("research") || p.includes("latest") || p.includes("current news") || p.includes("recent paper") || p.includes("patent") || p.includes("market trend")) {
    return "RESEARCH";
  }

  // Learn & Study
  if (p.includes("teach me") || p.includes("learn") || p.includes("roadmap") || p.includes("course") || p.includes("beginner guide")) {
    return "LEARN";
  }
  if (p.includes("explain in detail") || p.includes("study notes") || p.includes("deep dive")) {
    return "STUDY";
  }
  if (p.includes("explain") || p.includes("what is") || p.includes("define") || p.includes("meaning of")) {
    return "EXPLAIN";
  }

  // Plan & Create
  if (p.includes("plan") || p.includes("schedule") || p.includes("strategy") || p.includes("roadmap")) {
    return "PLAN";
  }
  if (p.includes("create") || p.includes("generate") || p.includes("write an essay") || p.includes("draft") || p.includes("pitch deck")) {
    return "CREATE";
  }
  if (p.includes("analyze") || p.includes("analysis") || p.includes("breakdown")) {
    return "ANALYZE";
  }

  return "GENERAL";
}

/**
 * Determines required response depth based on query complexity.
 */
export function determineDepth(prompt: string, intent: IntentType): ResponseDepth {
  const p = prompt.toLowerCase().trim();
  const wordCount = p.split(/\s+/).length;

  if (p.includes("in short") || p.includes("briefly") || p.includes("quick answer") || p.includes("one line") || wordCount <= 4) {
    return "SIMPLE";
  }

  if (
    p.includes("in detail") || p.includes("step by step") || p.includes("comprehensive") ||
    p.includes("complete guide") || p.includes("architecture") || p.includes("roadmap") ||
    intent === "RESEARCH" || intent === "LEARN" || intent === "DOCUMENT_ANALYSIS" || intent === "PLAN"
  ) {
    return "COMPLEX";
  }

  return "MEDIUM";
}

/**
 * Detects user language/communication style preference.
 */
export function detectUserStyle(prompt: string): UserLanguageStyle {
  const p = prompt.toLowerCase();
  
  // Detect Telugu-English mix (hinglish/tenglish keywords)
  const teluguEnglishWords = ["cheppu", "enti", "ela", "yela", "bhayya", "bro", "kavali", "koncham", "chudu", "ardham"];
  if (teluguEnglishWords.some(w => p.includes(w))) {
    return "TELUGU_ENGLISH";
  }

  if (p.split(/\s+/).length <= 3) {
    return "SHORT";
  }

  if (p.includes("architecture") || p.includes("polymorphism") || p.includes("asynchronous") || p.includes("microservices") || p.includes("optimization")) {
    return "ENGLISH_TECHNICAL";
  }

  return "ENGLISH_SIMPLE";
}

/**
 * Complete intent analysis pipeline.
 */
export function analyzeUserRequest(prompt: string, mode?: string, hasImage?: boolean, hasPdf?: boolean): IntentAnalysis {
  const intent = classifyIntent(prompt, hasImage, hasPdf);
  const depth = determineDepth(prompt, intent);
  const userStyle = detectUserStyle(prompt);
  const isFollowUp = checkIsFollowUp(prompt);

  const pLower = prompt.toLowerCase();
  const needsWebSearch =
    mode === "research" ||
    intent === "RESEARCH" ||
    ["latest", "current", "news", "today", "who is", "release date", "market price", "recent"].some(k => pLower.includes(k));

  const needsCalculator =
    intent === "CALCULATE" ||
    (intent === "SOLVE" && /\d+[\s+\-*/^]+\d+/.test(prompt));

  const needsPatsnap =
    mode === "research" &&
    ["patent", "prior art", "assignee", "intellectual property", "claims"].some(k => pLower.includes(k));

  return {
    intent,
    depth,
    userStyle,
    needsWebSearch,
    needsCalculator,
    needsPatsnap,
    isFollowUp
  };
}
