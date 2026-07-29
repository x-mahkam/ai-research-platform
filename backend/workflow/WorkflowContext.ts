import { IResearchGoal, INextExperimentRequest, IGoalEvaluation } from '../ai/types.js';
import { ISimulationResult } from '../results/ResultModel.js';
import { IWorkflowConfig, IWorkflowSerializedContext, WorkflowState } from './types.js';
import { WorkflowStateTracker } from './WorkflowState.js';

export class WorkflowContext {
  public readonly workflowId: string;
  public readonly projectId: string;
  public readonly goal: IResearchGoal;
  public readonly simulator: string;
  public readonly pluginId: string;

  public stateTracker: WorkflowStateTracker;
  public iteration: number = 0;
  public currentExperimentId: string = '';
  public currentRunId: string = '';
  public currentParameters: Record<string, number | string> = {};
  public lastResult?: ISimulationResult;
  public lastEvaluation?: IGoalEvaluation;
  public lastNextRequest?: INextExperimentRequest;
  public isPaused: boolean = false;
  public retryCount: number = 0;
  public readonly maxRetries: number;
  public createdAt: string;
  public updatedAt: string;
  public finalReport?: unknown;

  constructor(config: IWorkflowConfig) {
    this.workflowId = config.workflowId;
    this.projectId = config.projectId;
    this.goal = config.goal;
    this.simulator = config.simulator;
    this.pluginId = config.pluginId;
    this.maxRetries = config.maxRetries ?? 3;
    this.stateTracker = new WorkflowStateTracker('Created');
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;

    if (config.initialParameters && Object.keys(config.initialParameters).length > 0) {
      this.currentParameters = { ...config.initialParameters };
    } else {
      // Derive default initial parameters from goal ranges midpoints
      this.currentParameters = this.deriveInitialParametersFromGoal(config.goal);
    }
  }

  public get state(): WorkflowState {
    return this.stateTracker.state;
  }

  public transitionTo(newState: WorkflowState, reason?: string): void {
    this.stateTracker.transitionTo(newState, reason);
    this.updatedAt = new Date().toISOString();
  }

  private deriveInitialParametersFromGoal(goal: IResearchGoal): Record<string, number | string> {
    const params: Record<string, number | string> = {};
    if (goal.allowedParameterRanges) {
      for (const [key, range] of Object.entries(goal.allowedParameterRanges)) {
        if (range.min !== undefined && range.max !== undefined) {
          params[key] = parseFloat(((range.min + range.max) / 2).toFixed(4));
        }
      }
    }
    return params;
  }

  public serialize(): IWorkflowSerializedContext {
    return {
      workflowId: this.workflowId,
      projectId: this.projectId,
      goal: this.goal,
      simulator: this.simulator,
      pluginId: this.pluginId,
      currentState: this.state,
      iteration: this.iteration,
      currentExperimentId: this.currentExperimentId,
      currentRunId: this.currentRunId,
      currentParameters: this.currentParameters,
      isPaused: this.isPaused,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      finalReport: this.finalReport,
    };
  }

  public static deserialize(data: IWorkflowSerializedContext, stateHistory?: any[]): WorkflowContext {
    const ctx = new WorkflowContext({
      workflowId: data.workflowId,
      projectId: data.projectId,
      goal: data.goal,
      simulator: data.simulator,
      pluginId: data.pluginId,
      maxRetries: data.maxRetries,
      initialParameters: data.currentParameters,
    });

    ctx.iteration = data.iteration;
    ctx.currentExperimentId = data.currentExperimentId;
    ctx.currentRunId = data.currentRunId;
    ctx.currentParameters = data.currentParameters;
    ctx.isPaused = data.isPaused;
    ctx.retryCount = data.retryCount;
    ctx.createdAt = data.createdAt;
    ctx.updatedAt = data.updatedAt;
    ctx.finalReport = data.finalReport;

    if (stateHistory && stateHistory.length > 0) {
      ctx.stateTracker.restoreHistory(stateHistory);
    } else {
      ctx.stateTracker.transitionTo(data.currentState, 'Restored from persistent context');
    }

    return ctx;
  }
}
