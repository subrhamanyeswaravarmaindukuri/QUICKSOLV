import { QuickSolvTool } from "./types";
import { evaluateMathExpression } from "@/services/ai/calculation";

export interface CalculatorInput {
  expression: string;
}

export interface CalculatorOutput {
  success: boolean;
  result?: string | number;
  formattedText?: string;
  error?: string;
}

export class CalculatorTool implements QuickSolvTool<CalculatorInput, CalculatorOutput> {
  id = "tool_calculator";
  name = "MathJS Formula Evaluator";
  description = "Evaluates mathematical expressions, algebraic formulas, and arithmetic operations deterministically.";
  timeoutMs = 5000;

  async execute(input: CalculatorInput): Promise<CalculatorOutput> {
    if (!input || !input.expression || typeof input.expression !== "string") {
      return { success: false, error: "Expression parameter must be a non-empty string." };
    }

    const evalResult = evaluateMathExpression(input.expression);
    if (!evalResult.success) {
      return { success: false, error: evalResult.error || "Math evaluation failed." };
    }

    return {
      success: true,
      result: String(evalResult.result),
      formattedText: String(evalResult.result)
    };
  }
}

export const calculatorTool = new CalculatorTool();
