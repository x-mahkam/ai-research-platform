import { aiEngine, AIEngine, AIChatInput, AIChatResult, AIReportInput } from '../core/aiEngine.js';
import { reportRepository, IReportRepository } from '../repositories/reportRepository.js';
import { GeneratedReport } from '../shared/types.js';
import { eventBus, DomainEventType } from '../events/eventEmitter.js';
import { agentManager, physicsKnowledgeBase } from '../ai/index.js';

export class AIService {
  constructor(
    private engine: AIEngine = aiEngine,
    private repRepo: IReportRepository = reportRepository
  ) {}

  public async chat(input: AIChatInput): Promise<AIChatResult> {
    return this.engine.generateChatResponse(input);
  }

  public async generateReport(input: AIReportInput): Promise<GeneratedReport> {
    const report = await this.engine.generateScientificReport(input);
    const saved = this.repRepo.create(report);
    eventBus.emitDomainEvent(DomainEventType.REPORT_GENERATED, saved);
    return saved;
  }

  public async planExperiment(goal: string, context?: any) {
    return agentManager.runPlannerAgent(goal, context);
  }

  public async analyzeResults(results: any) {
    return agentManager.runAnalyzerAgent(results);
  }

  public async predictOptimization(targetMetric: string, currentParameters: Record<string, unknown>) {
    return agentManager.runOptimizerAgent(targetMetric, currentParameters);
  }

  public async queryKnowledge(query: string) {
    return physicsKnowledgeBase.searchKnowledge(query);
  }
}

export const aiService = new AIService();
