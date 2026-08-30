import { QuickSolvTool } from "./types";
import { calculatorTool } from "./calculatorTool";
import { patentSearchTool } from "./patentSearchTool";
import { QuickSolvToolExecutionRecord } from "../types";

export class QuickSolvToolRegistry {
  private tools: Map<string, QuickSolvTool> = new Map();

  constructor() {
    this.registerTool(calculatorTool);
    this.registerTool(patentSearchTool);
  }

  registerTool(tool: QuickSolvTool): void {
    this.tools.set(tool.id, tool);
  }

  getTool(id: string): QuickSolvTool | undefined {
    return this.tools.get(id);
  }

  getAllTools(): QuickSolvTool[] {
    return Array.from(this.tools.values());
  }

  async executeTool(toolId: string, input: any): Promise<QuickSolvToolExecutionRecord> {
    const tool = this.getTool(toolId);
    const startTime = performance.now();

    if (!tool) {
      return {
        toolId,
        toolName: "Unknown Tool",
        input,
        output: null,
        success: false,
        durationMs: 0
      };
    }

    try {
      const output = await tool.execute(input);
      const endTime = performance.now();
      return {
        toolId: tool.id,
        toolName: tool.name,
        input,
        output,
        success: output?.success !== false,
        durationMs: Math.round(endTime - startTime)
      };
    } catch (err: any) {
      const endTime = performance.now();
      return {
        toolId: tool.id,
        toolName: tool.name,
        input,
        output: { error: err.message || "Tool execution error" },
        success: false,
        durationMs: Math.round(endTime - startTime)
      };
    }
  }
}

export const quickSolvToolRegistry = new QuickSolvToolRegistry();
