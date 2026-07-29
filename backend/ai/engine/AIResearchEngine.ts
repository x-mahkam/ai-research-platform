import { ISimulationResult } from '../../results/ResultModel.js';
import {
  IResearchGoal,
  INextExperimentRequest,
  IGoalEvaluation,
  IExperimentRecord,
} from '../types.js';
import { goalEvaluator } from './GoalEvaluator.js';
import { parameterGenerator } from './ParameterGenerator.js';
import { experimentComparator } from './ExperimentComparator.js';
import { knowledgeManager } from '../knowledge/index.js';
import { physicsReasoningEngine } from '../reasoning/index.js';
import { optimizationEngine } from '../optimizer/index.js';
import { researchPlanner } from '../planner/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('AIResearchEngine');

export class AIResearchEngine {
  /**
   * Main entry point when Simulation Engine completes a run and sends SimulationResult
   */
  public async processSimulationResult(
    goal: IResearchGoal,
    simulationResult: ISimulationResult,
    currentParameters: Record<string, number | string>,
    userRequestedStop: boolean = false
  ): Promise<INextExperimentRequest> {
    const experimentId = simulationResult.experimentId;
    const runId = simulationResult.runId;
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    logger.info(`AIResearchEngine processing simulation result for experiment ${experimentId}, run ${runId}`);

    // 1. Evaluate Research Goal
    const prevHistory = knowledgeManager.getExperimentHistory(experimentId);
    const prevEvals = prevHistory.map((h) => h.evaluation);
    const evaluation: IGoalEvaluation = goalEvaluator.evaluateGoal(goal, simulationResult, prevEvals);

    // 2. Record in Knowledge Manager
    const currentRecord: IExperimentRecord = {
      experimentId,
      runId,
      parameters: currentParameters,
      result: simulationResult,
      evaluation,
      timestamp: new Date().toISOString(),
    };
    knowledgeManager.recordExperiment(experimentId, currentRecord);

    // 3. Compare with Previous Experiment Runs
    const comparison = experimentComparator.compareRuns(currentRecord, prevHistory);

    // 4. Check Stopping Conditions
    const history = knowledgeManager.getExperimentHistory(experimentId);
    let shouldStop = false;
    let stoppingReason: INextExperimentRequest['stoppingDecision']['reason'] = 'In Progress';

    if (userRequestedStop) {
      shouldStop = true;
      stoppingReason = 'User Stop';
    } else if (evaluation.isGoalReached) {
      shouldStop = true;
      stoppingReason = 'Goal Achieved';
    } else if (history.length >= goal.maxExperiments) {
      shouldStop = true;
      stoppingReason = 'Maximum Iterations';
    } else if (comparison.overallTrend === 'STAGNANT' && history.length >= 4) {
      const recentStagnant = history.slice(-3).every((h) => h.evaluation.convergenceTrend === 'STAGNANT');
      if (recentStagnant) {
        shouldStop = true;
        stoppingReason = 'No Further Improvement';
      }
    } else if (evaluation.constraintViolations.length >= 3 && history.length >= 3) {
      shouldStop = true;
      stoppingReason = 'Safety Limit';
    }

    // 5. Generate Next Parameters (if not stopping)
    let updatedParameters: Record<string, number | string> = { ...currentParameters };

    if (!shouldStop) {
      updatedParameters = optimizationEngine.generateNextParameters({
        goal,
        currentParameters,
        history,
        lastResult: simulationResult,
      });

      // Strict validation & sanitization via ParameterGenerator
      updatedParameters = parameterGenerator.sanitizeParameters(
        updatedParameters,
        goal.allowedParameterRanges
      );
    }

    // 6. Generate AI Reasoning & Explanation
    const reasoningExplanation = physicsReasoningEngine.generateParameterSelectionReasoning(
      goal,
      updatedParameters,
      comparison,
      evaluation
    );

    // 7. Compute Priority & Expected Improvement
    const expectedImprovement = shouldStop ? 0 : Math.max(5, Math.min(30, comparison.convergenceSpeed || 15));
    const priority = evaluation.constraintViolations.length > 0 ? 'CRITICAL' : 'HIGH';

    logger.info(
      `AIResearchEngine decision for ${experimentId}: StoppingReason=${stoppingReason}, NextParams=${JSON.stringify(
        updatedParameters
      )}`
    );

    return {
      requestId,
      experimentId,
      runId,
      updatedParameters,
      optimizationReason: reasoningExplanation.explanation,
      priority,
      expectedImprovement,
      stoppingDecision: {
        shouldStop,
        reason: stoppingReason,
      },
      reasoning: {
        explanation: reasoningExplanation.explanation,
        improvedMetrics: reasoningExplanation.improvedMetrics,
        worsenedMetrics: reasoningExplanation.worsenedMetrics,
        confidenceScore: reasoningExplanation.confidenceScore,
      },
    };
  }

  /**
   * Initializes a research plan for a new research goal
   */
  public initializeGoalPlan(goal: IResearchGoal) {
    return researchPlanner.createResearchPlan(goal);
  }
}

export const aiResearchEngine = new AIResearchEngine();
