import { QuickSolvTool, QuickSolvToolPermission, QuickSolvToolValidationResult } from "./types";
import { evaluateMathExpression } from "@/services/ai/calculation";

export interface CalculatorInput {
  expression: string;
}

export interface CalculatorOutput {
  success: boolean;
  result?: string;
  error?: string;
}

export class CalculatorTool implements QuickSolvTool<CalculatorInput, CalculatorOutput> {
  id = "tool_calculator";
  name = "MathJS Formula Evaluator";
  description = "Evaluates mathematical expressions, algebraic formulas, and arithmetic operations deterministically.";
  permissions: QuickSolvToolPermission[] = ["public-safe", "authenticated", "developer-api"];
  defaultTimeoutMs = 5000;
  maxOutputSizeBytes = 5000; // 5KB max result payload

  validateInput(input: CalculatorInput): QuickSolvToolValidationResult {
    if (!input || typeof input !== "object") {
      return { valid: false, error: "Input must be an object containing an 'expression' string property." };
    }

    if (typeof input.expression !== "string") {
      return { valid: false, error: "Expression property must be a string." };
    }

    const trimmed = input.expression.trim();
    if (!trimmed) {
      return { valid: false, error: "Expression string cannot be empty." };
    }

    if (trimmed.length > 1000) {
      return { valid: false, error: "Expression exceeds maximum allowed length of 1,000 characters." };
    }

    return { valid: true, sanitizedInput: { expression: trimmed } };
  }

  async execute(input: CalculatorInput): Promise<CalculatorOutput> {
    const validation = this.validateInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.error || "Invalid input." };
    }

    const sanitizedExpr = validation.sanitizedInput.expression;

    try {
      const evalResult = evaluateMathExpression(sanitizedExpr);
      if (!evalResult.success) {
        return { success: false, error: evalResult.error || "Math evaluation failed." };
      }

      const resultStr = String(evalResult.result);
      if (resultStr.length > this.maxOutputSizeBytes) {
        return { success: false, error: "Calculation output exceeded maximum payload size limits." };
      }

      return {
        success: true,
        result: resultStr
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Math evaluation error occurred."
      };
    }
  }
}

export const calculatorTool = new CalculatorTool();
