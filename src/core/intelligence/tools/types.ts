export interface QuickSolvTool<TInput = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  permissions?: string[];
  timeoutMs?: number;
  execute(input: TInput): Promise<TOutput>;
}
