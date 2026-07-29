import { LoggerService } from '../logging/logger.js';
import { IWorkflowConfig, IWorkflowHistoryEntry, IWorkflowStatusData } from './types.js';
import { WorkflowContext } from './WorkflowContext.js';
import { workflowHistory } from './WorkflowHistory.js';
import { workflowPersistence } from './WorkflowPersistence.js';
import { workflowRunner } from './WorkflowRunner.js';
import { workflowScheduler } from './WorkflowScheduler.js';

const logger = new LoggerService('WorkflowManager');

export class WorkflowManager {
  private activeWorkflows: Map<string, WorkflowContext> = new Map();

  constructor() {
    // Automatically perform crash recovery scan on initialization
    this.recoverAllWorkflows().catch((err) => {
      logger.error('Error during automatic workflow recovery scan', { error: err.message });
    });
  }

  /**
   * Start a new research workflow
   */
  public async startWorkflow(config: IWorkflowConfig): Promise<WorkflowContext> {
    logger.info(`Starting new workflow ${config.workflowId} for project ${config.projectId}`);

    if (this.activeWorkflows.has(config.workflowId)) {
      const existing = this.activeWorkflows.get(config.workflowId)!;
      if (!existing.stateTracker.isTerminal()) {
        logger.warn(`Workflow ${config.workflowId} is already active.`);
        return existing;
      }
    }

    const context = new WorkflowContext(config);
    this.activeWorkflows.set(context.workflowId, context);

    // Save initial state to persistence
    workflowPersistence.saveWorkflow(context, []);

    // Kick off asynchronously to not block API return
    setImmediate(async () => {
      await workflowRunner.executeCycle(context);
    });

    return context;
  }

  /**
   * Pause a running workflow
   */
  public async pauseWorkflow(workflowId: string): Promise<boolean> {
    const context = this.getWorkflowContext(workflowId);
    if (!context) return false;

    logger.info(`Pausing workflow ${workflowId}`);
    context.isPaused = true;
    workflowScheduler.cancelScheduledRun(workflowId);
    context.transitionTo('Waiting', 'Workflow paused by user request');
    workflowPersistence.saveWorkflow(context, workflowHistory.getHistory(workflowId));
    return true;
  }

  /**
   * Resume a paused workflow
   */
  public async resumeWorkflow(workflowId: string): Promise<boolean> {
    const context = this.getWorkflowContext(workflowId);
    if (!context || !context.isPaused) return false;

    logger.info(`Resuming workflow ${workflowId}`);
    context.isPaused = false;
    context.transitionTo('Ready', 'Workflow resumed by user request');
    workflowPersistence.saveWorkflow(context, workflowHistory.getHistory(workflowId));

    setImmediate(async () => {
      await workflowRunner.executeCycle(context);
    });

    return true;
  }

  /**
   * Cancel an active workflow
   */
  public async cancelWorkflow(workflowId: string): Promise<boolean> {
    const context = this.getWorkflowContext(workflowId);
    if (!context) return false;

    logger.info(`Cancelling workflow ${workflowId}`);
    workflowScheduler.cancelScheduledRun(workflowId);
    context.transitionTo('Cancelled', 'Workflow cancelled by user request');
    workflowPersistence.saveWorkflow(context, workflowHistory.getHistory(workflowId));
    return true;
  }

  /**
   * Restart a workflow from iteration 0
   */
  public async restartWorkflow(workflowId: string): Promise<boolean> {
    const context = this.getWorkflowContext(workflowId);
    if (!context) return false;

    logger.info(`Restarting workflow ${workflowId}`);
    workflowScheduler.cancelScheduledRun(workflowId);

    context.iteration = 0;
    context.retryCount = 0;
    context.isPaused = false;
    context.transitionTo('Preparing', 'Workflow restarted by user request');

    workflowPersistence.saveWorkflow(context, workflowHistory.getHistory(workflowId));

    setImmediate(async () => {
      await workflowRunner.executeCycle(context);
    });

    return true;
  }

  /**
   * Retrieves detailed status data for a workflow
   */
  public getWorkflowStatus(workflowId: string): IWorkflowStatusData | undefined {
    const context = this.getWorkflowContext(workflowId);
    if (!context) return undefined;

    return {
      workflowId: context.workflowId,
      projectId: context.projectId,
      state: context.state,
      iteration: context.iteration,
      currentExperimentId: context.currentExperimentId,
      currentRunId: context.currentRunId,
      isPaused: context.isPaused,
      retryCount: context.retryCount,
      goalReached: context.lastEvaluation?.isGoalReached || context.state === 'Completed',
      goalName: context.goal.name,
      currentParameters: context.currentParameters,
      updatedAt: context.updatedAt,
      stateHistory: context.stateTracker.getHistory(),
    };
  }

  /**
   * Gets complete history trail for a workflow
   */
  public getWorkflowHistory(workflowId: string): IWorkflowHistoryEntry[] {
    return workflowHistory.getHistory(workflowId);
  }

  /**
   * List all known workflow contexts
   */
  public listAllWorkflows(): WorkflowContext[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Scans disk persistence and recovers all non-terminal workflows following crash/restart
   */
  public async recoverAllWorkflows(): Promise<void> {
    const savedIds = workflowPersistence.listSavedWorkflowIds();
    logger.info(`Found ${savedIds.length} persisted workflow records on disk. Checking recovery status...`);

    for (const id of savedIds) {
      if (this.activeWorkflows.has(id)) continue;

      const loaded = workflowPersistence.loadWorkflow(id);
      if (loaded) {
        const { context, history } = loaded;
        this.activeWorkflows.set(id, context);
        workflowHistory.setHistory(id, history);

        if (!context.stateTracker.isTerminal()) {
          logger.info(`Resuming active non-terminal workflow [${id}] in state [${context.state}]...`);
          await workflowRunner.recoverAndResumeWorkflow(context);
        }
      }
    }
  }

  private getWorkflowContext(workflowId: string): WorkflowContext | undefined {
    if (this.activeWorkflows.has(workflowId)) {
      return this.activeWorkflows.get(workflowId);
    }
    // Attempt load from persistence if not in memory
    const loaded = workflowPersistence.loadWorkflow(workflowId);
    if (loaded) {
      this.activeWorkflows.set(workflowId, loaded.context);
      workflowHistory.setHistory(workflowId, loaded.history);
      return loaded.context;
    }
    return undefined;
  }
}

export const workflowManager = new WorkflowManager();
