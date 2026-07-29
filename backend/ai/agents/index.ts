import { experimentPlanner } from '../planner/index.js';
import { resultAnalyzer } from '../analyzer/index.js';
import { researchReporter } from '../reporter/index.js';
import { optimizationPredictor } from '../optimizer/index.js';
import { physicsReasoningEngine } from '../reasoning/index.js';
import { IAIContextPayload } from '../context/index.js';

export class AgentManager {
  public async runPlannerAgent(goal: string, context?: IAIContextPayload) {
    const plan = experimentPlanner.planExperiment(goal, context);
    return {
      agent: 'PlannerAgent',
      plan,
    };
  }

  public async runAnalyzerAgent(results: any) {
    const analysis = resultAnalyzer.analyzeResults(results);
    return {
      agent: 'AnalyzerAgent',
      analysis,
    };
  }

  public async runReporterAgent(input: any) {
    const report = researchReporter.generateReport(input);
    return {
      agent: 'ReporterAgent',
      report,
    };
  }

  public async runOptimizerAgent(targetMetric: string, currentParameters: Record<string, unknown>) {
    const prediction = optimizationPredictor.predictOptimizationDirection(targetMetric, currentParameters);
    return {
      agent: 'OptimizerAgent',
      prediction,
    };
  }

  public async runExplainerAgent(prompt: string, context: IAIContextPayload) {
    const reasoning = physicsReasoningEngine.executeChainOfThought(prompt, context);
    return {
      agent: 'ExplainerAgent',
      reasoning,
    };
  }
}

export const agentManager = new AgentManager();
