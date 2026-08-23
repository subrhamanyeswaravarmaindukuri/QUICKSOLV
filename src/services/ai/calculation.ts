import * as math from "mathjs";

export interface CalculationResult {
  success: boolean;
  result?: string;
  error?: string;
}

/**
 * Clean up common math notations (including raw LaTeX symbols) so they can be parsed by mathjs.
 */
export function sanitizeMathExpression(expression: string): string {
  return expression
    // Replace LaTeX symbols
    .replace(/\\times/g, "*")
    .replace(/\\cdot/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, "($1)/($2)")
    .replace(/\\sqrt{([^}]+)}/g, "sqrt($1)")
    .replace(/\^/g, "^") // exponents
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    // Remove formatting backslashes
    .replace(/\\left\(/g, "(")
    .replace(/\\right\)/g, ")")
    .replace(/\\/g, "")
    .trim();
}

/**
 * Safely evaluates a math expression with a given scope of variables.
 */
export function evaluateMathExpression(
  expression: string,
  scope: Record<string, any> = {}
): CalculationResult {
  try {
    const sanitized = sanitizeMathExpression(expression);
    
    // Evaluate using mathjs
    const result = math.evaluate(sanitized, scope);
    
    return {
      success: true,
      result: typeof result === "number" ? parseFloat(result.toFixed(6)).toString() : String(result)
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Evaluation failed"
    };
  }
}

/**
 * Checks if two values are mathematically equivalent (within small floating-point threshold).
 */
export function compareCalculations(val1: string | number, val2: string | number): boolean {
  const num1 = parseFloat(String(val1).replace(/[^\d.-]/g, ""));
  const num2 = parseFloat(String(val2).replace(/[^\d.-]/g, ""));

  if (isNaN(num1) || isNaN(num2)) {
    // Fallback to strict string comparison if not numeric
    return String(val1).trim().toLowerCase() === String(val2).trim().toLowerCase();
  }

  // Tolerant comparison
  return Math.abs(num1 - num2) < 1e-4;
}

/**
 * Parses and evaluates simple mathematical queries dynamically.
 * Returns the calculated result as a string if valid, otherwise null.
 */
export function tryResolveCalculator(prompt: string): string | null {
  let expr = prompt.toLowerCase();
  
  // Replace "X% of Y" with "(X/100) * Y"
  expr = expr.replace(/([0-9,.]+)\s*%\s*of\s*([0-9,.]+)/g, (match, p1, p2) => {
    const cleanP1 = p1.replace(/,/g, "");
    const cleanP2 = p2.replace(/,/g, "");
    return `(${cleanP1}/100) * ${cleanP2}`;
  });

  // Replace "X%" with "(X/100)"
  expr = expr.replace(/([0-9.]+)\s*%/g, "($1/100)");

  // Remove common question words
  expr = expr.replace(/what is|calculate|solve|eval|compute|\?|=/g, "").trim();

  // If the expression only contains math characters, evaluate it
  if (expr && /^[0-9.+\-*/%()\s]+$/.test(expr)) {
    const calcRes = evaluateMathExpression(expr);
    if (calcRes.success && calcRes.result) {
      return calcRes.result;
    }
  }
  return null;
}
