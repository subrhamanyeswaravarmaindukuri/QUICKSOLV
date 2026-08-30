export type QuickSolvToolPermission =
  | "public-safe"
  | "authenticated"
  | "developer-api"
  | "admin-only"
  | "internal-only";

export interface QuickSolvToolValidationResult {
  valid: boolean;
  error?: string;
  sanitizedInput?: any;
}

export interface QuickSolvToolResult<TData = any> {
  success: boolean;
  toolId: string;
  toolName: string;
  data: TData | null;
  error?: string;
  durationMs: number;
  permissionGranted: boolean;
}

export interface QuickSolvTool<TInput = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  permissions: QuickSolvToolPermission[];
  defaultTimeoutMs: number;
  maxOutputSizeBytes?: number;
  inputSchema?: Record<string, any>;
  validateInput(input: TInput): QuickSolvToolValidationResult;
  execute(input: TInput): Promise<TOutput>;
}
