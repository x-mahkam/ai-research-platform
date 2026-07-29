import { ISimulationResult } from '../results/ResultModel.js';

export interface IAllowedParameterRange {
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
}

export interface IResearchGoal {
  goalId: string;
  name: string;
  description?: string;
  targetThresholdVoltage?: number; // V
  targetIon?: number; // A or A/um
  maxIoff?: number; // A or A/um
  targetSubthresholdSwing?: number; // mV/dec
  targetDibl?: number; // mV/V
  maxPower?: number; // W
  maxTemperature?: number; // K
  allowedParameterRanges: Record<string, IAllowedParameterRange>;
  maxExperiments: number;
  optimizerAlgorithm?: 'GridSearch' | 'RandomSearch' | 'BayesianOptimization' | 'GeneticAlgorithm' | 'ParticleSwarm' | string;
  customTargets?: Record<string, number>;
}

export interface IGoalEvaluation {
  goalId: string;
  isGoalReached: boolean;
  distanceToTarget: Record<string, number>;
  constraintViolations: string[];
  convergenceTrend: 'IMPROVING' | 'REGRESSING' | 'STAGNANT' | 'INITIAL';
  summary: string;
}

export interface IComparisonResult {
  currentRunId: string;
  previousRunId?: string;
  improvedMetrics: string[];
  worsenedMetrics: string[];
  unchangedMetrics: string[];
  overallTrend: 'IMPROVING' | 'REGRESSING' | 'STAGNANT';
  convergenceSpeed: number; // percentage change rate
}

export interface IExperimentRecord {
  experimentId: string;
  runId: string;
  parameters: Record<string, number | string>;
  result: ISimulationResult;
  evaluation: IGoalEvaluation;
  timestamp: string;
}

export interface IOptimizerContext {
  goal: IResearchGoal;
  currentParameters: Record<string, number | string>;
  history: IExperimentRecord[];
  lastResult?: ISimulationResult;
}

export interface IOptimizerStrategy {
  name: string;
  generateNextParameters(context: IOptimizerContext): Record<string, number | string>;
}

export interface INextExperimentRequest {
  requestId: string;
  experimentId: string;
  runId: string;
  updatedParameters: Record<string, number | string>;
  optimizationReason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expectedImprovement: number; // percentage
  stoppingDecision: {
    shouldStop: boolean;
    reason: 'Goal Achieved' | 'Maximum Iterations' | 'No Further Improvement' | 'User Stop' | 'Safety Limit' | 'In Progress';
  };
  reasoning: {
    explanation: string;
    improvedMetrics: string[];
    worsenedMetrics: string[];
    confidenceScore: number;
  };
}
