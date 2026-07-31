import { aiEngineOrchestrator, AIEngineOrchestrator } from '../ai/engine/index.js';
import { GeneratedReport, ExperimentSetupProposal } from '../shared/types.js';

export interface AIChatInput {
  prompt: string;
  experimentContext?: Record<string, unknown>;
  history?: unknown[];
  sessionId?: string;
  experimentId?: string;
  jobId?: string;
  targetMetric?: string;
  providers?: string[];
}

export interface AIChatResult {
  text: string;
  reasoning?: string;
  suggestedParameters?: Record<string, unknown>;
  reasoningSteps?: string[];
  experimentPlan?: unknown;
  analysisReport?: unknown;
  optimizationPrediction?: unknown;
}

export interface AIReportInput {
  experiment: any;
  projectName?: string;
}

export class AIEngine {
  private orchestrator: AIEngineOrchestrator = aiEngineOrchestrator;

  public async generateChatResponse(input: AIChatInput): Promise<AIChatResult> {
    const res = await this.orchestrator.processRequest({
      prompt: input.prompt,
      sessionId: input.sessionId,
      experimentId: input.experimentId || (input.experimentContext?.id as string),
      jobId: input.jobId,
      targetMetric: input.targetMetric,
      providers: input.providers || (input.experimentContext?.aiProviders as string[] | undefined),
    });

    return {
      text: res.text,
      reasoningSteps: res.reasoningSteps,
      suggestedParameters: res.suggestedParameters,
      experimentPlan: res.experimentPlan,
      analysisReport: res.analysisReport,
      optimizationPrediction: res.optimizationPrediction,
    };
  }

  public async generateScientificReport(input: AIReportInput): Promise<GeneratedReport> {
    return await this.orchestrator.generateScientificReport(input);
  }

  public async generateExperimentSetup(input: {
    objective: string;
    simulator?: string;
    providers?: string[];
  }): Promise<ExperimentSetupProposal> {
    return await this.orchestrator.generateExperimentSetup(input);
  }
}

export const aiEngine = new AIEngine();
