import { QuickSolvTool, QuickSolvToolPermission, QuickSolvToolResult } from "./types";
import { calculatorTool } from "./calculatorTool";
import { patentSearchTool } from "./patentSearchTool";

export class QuickSolvToolRegistry {
  private tools: Map<string, QuickSolvTool> = new Map();

  constructor() {
    this.registerTool(calculatorTool);
    this.registerTool(patentSearchTool);
  }

  /**
   * Registers a tool safely. Rejects duplicate IDs unless explicitly allowed.
   */
  registerTool(tool: QuickSolvTool, allowOverwrite = false): boolean {
    if (!tool || !tool.id) {
      throw new Error("Cannot register a tool without a valid ID.");
    }

    if (this.tools.has(tool.id) && !allowOverwrite) {
      console.warn(`[ToolRegistry] Tool '${tool.id}' is already registered. Overwrite ignored.`);
      return false;
    }

    this.tools.set(tool.id, tool);
    return true;
  }

  getTool(id: string): QuickSolvTool | undefined {
    return this.tools.get(id);
  }

  hasTool(id: string): boolean {
    return this.tools.has(id);
  }

  /**
   * Returns available tools filtered by requested permission level.
   */
  getAvailableTools(userPermission: QuickSolvToolPermission = "public-safe"): QuickSolvTool[] {
    return Array.from(this.tools.values()).filter(t => t.permissions.includes(userPermission));
  }

  getAllTools(): QuickSolvTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Safe Tool Execution Lifecycle:
   * 1. Tool Lookup
   * 2. Permission Check
   * 3. Input Validation
   * 4. Execution with Timeout Enforcement
   * 5. Result Normalization
   */
  async executeTool<TInput = any, TOutput = any>(
    toolId: string,
    input: TInput,
    userPermission: QuickSolvToolPermission = "public-safe"
  ): Promise<QuickSolvToolResult<TOutput>> {
    const startTime = performance.now();
    const tool = this.getTool(toolId);

    // 1. Tool Lookup Check
    if (!tool) {
      return {
        success: false,
        toolId,
        toolName: "Unknown Tool",
        data: null,
        error: `Tool '${toolId}' is not registered in QuickSolv tool registry.`,
        durationMs: 0,
        permissionGranted: false
      };
    }

    // 2. Permission Check
    const hasPermission = tool.permissions.includes(userPermission);
    if (!hasPermission) {
      return {
        success: false,
        toolId: tool.id,
        toolName: tool.name,
        data: null,
        error: `Permission denied: Tool '${tool.id}' requires one of [${tool.permissions.join(", ")}]. Current permission: '${userPermission}'.`,
        durationMs: Math.round(performance.now() - startTime),
        permissionGranted: false
      };
    }

    // 3. Input Validation
    const validation = tool.validateInput(input);
    if (!validation.valid) {
      return {
        success: false,
        toolId: tool.id,
        toolName: tool.name,
        data: null,
        error: `Input validation failed for tool '${tool.id}': ${validation.error}`,
        durationMs: Math.round(performance.now() - startTime),
        permissionGranted: true
      };
    }

    // 4. Execution with Timeout Protection
    const timeoutMs = tool.defaultTimeoutMs || 5000;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms.`)), timeoutMs)
      );

      const output = await Promise.race([tool.execute(validation.sanitizedInput || input), timeoutPromise]);
      const endTime = performance.now();

      return {
        success: output?.success !== false,
        toolId: tool.id,
        toolName: tool.name,
        data: output,
        error: output?.error,
        durationMs: Math.round(endTime - startTime),
        permissionGranted: true
      };
    } catch (err: any) {
      const endTime = performance.now();
      return {
        success: false,
        toolId: tool.id,
        toolName: tool.name,
        data: null,
        error: err.message || "Tool execution error occurred.",
        durationMs: Math.round(endTime - startTime),
        permissionGranted: true
      };
    }
  }
}

export const quickSolvToolRegistry = new QuickSolvToolRegistry();
