import { QuickSolvRequest, QuickSolvResponse } from "./types";
import { QuickSolvToolPermission } from "./tools/types";
import { quickSolvExecutionEngine } from "./engine/executionEngine";

export class QuickSolvIntelligenceRouter {
  /**
   * Processes a QuickSolv 1.0 Intelligence Layer request.
   * Delegates request to the hardened Step 5 Production AI Execution Engine.
   */
  async processRequest(
    request: QuickSolvRequest,
    userPermission: QuickSolvToolPermission = "public-safe"
  ): Promise<QuickSolvResponse> {
    return quickSolvExecutionEngine.execute(request, userPermission);
  }
}

export const quickSolvIntelligenceRouter = new QuickSolvIntelligenceRouter();
