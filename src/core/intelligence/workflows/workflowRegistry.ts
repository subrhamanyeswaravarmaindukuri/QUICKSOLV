import { QuickSolvTaskType } from "../types";
import { QuickSolvWorkflow } from "./types";
import { generalChatWorkflow } from "./generalChatWorkflow";
import { mathWorkflow } from "./mathWorkflow";
import { codingWorkflow } from "./codingWorkflow";
import { studyWorkflow } from "./studyWorkflow";
import { researchWorkflow } from "./researchWorkflow";
import { documentWorkflow } from "./documentWorkflow";
import { visionWorkflow } from "./visionWorkflow";
import { creativeWorkflow } from "./creativeWorkflow";

export class QuickSolvWorkflowRegistry {
  private workflows: Map<QuickSolvTaskType, QuickSolvWorkflow> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.registerWorkflow(generalChatWorkflow);
    this.registerWorkflow(mathWorkflow);
    this.registerWorkflow(codingWorkflow);
    this.registerWorkflow(studyWorkflow);
    this.registerWorkflow(researchWorkflow);
    this.registerWorkflow(documentWorkflow);
    this.registerWorkflow(visionWorkflow);
    this.registerWorkflow(creativeWorkflow);
  }

  registerWorkflow(workflow: QuickSolvWorkflow) {
    this.workflows.set(workflow.taskType, workflow);
  }

  getWorkflow(taskType: QuickSolvTaskType): QuickSolvWorkflow {
    const workflow = this.workflows.get(taskType);
    if (workflow) {
      return workflow;
    }
    // Fallback to General Chat Workflow for unrecognized or future task types
    return generalChatWorkflow;
  }

  hasWorkflow(taskType: QuickSolvTaskType): boolean {
    return this.workflows.has(taskType);
  }

  getRegisteredTaskTypes(): QuickSolvTaskType[] {
    return Array.from(this.workflows.keys());
  }
}

export const quickSolvWorkflowRegistry = new QuickSolvWorkflowRegistry();
