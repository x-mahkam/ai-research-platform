import { IResearchGoal, INextExperimentRequest, IGoalEvaluation } from '../ai/types.js';
import { ISimulationResult } from '../results/ResultModel.js';

export type WorkflowState =
  | 'Created'
  | 'Preparing'
  | 'Ready'
  | 'Running'
  | 'Waiting'
  | 'Parsing'
  | 'Analyzing'
  | 'Optimizing'
  | 'SchedulingNextRun'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export interface IWorkflowConfig {
  workflowId: string;
  projectId: string;
  goal: IResearchGoal;
  simulator: string;
  pluginId: string;
  maxRetries?: number;
  initialParameters?: Record<string, number | string>;
}

export interface IWorkflowHistoryEntry {
  id: string;
  workflowId: string;
  experimentId: string;
  runId: string;
  iteration: number;
  state: WorkflowState;
  parameters: Record<string, number | string>;
  result?: ISimulationResult;
  evaluation?: IGoalEvaluation;
  nextRequest?: INextExperimentRequest;
  timestamp: string;
  notes?: string;
}

export interface IWorkflowSerializedContext {
  workflowId: string;
  projectId: string;
  goal: IResearchGoal;
  simulator: string;
  pluginId: string;
  currentState: WorkflowState;
  iteration: number;
  currentExperimentId: string;
  currentRunId: string;
  currentParameters: Record<string, number | string>;
  isPaused: boolean;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  finalReport?: unknown;
}

export interface IWorkflowStatusData {
  workflowId: string;
  projectId: string;
  state: WorkflowState;
  iteration: number;
  currentExperimentId: string;
  currentRunId: string;
  isPaused: boolean;
  retryCount: number;
  goalReached: boolean;
  goalName: string;
  currentParameters: Record<string, number | string>;
  updatedAt: string;
  stateHistory: Array<{ state: WorkflowState; timestamp: string; reason?: string }>;
}
