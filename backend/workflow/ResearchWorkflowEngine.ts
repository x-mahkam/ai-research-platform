import { LoggerService } from '../logging/logger.js';
import { IWorkflowConfig, IWorkflowHistoryEntry, IWorkflowStatusData } from './types.js';
import { WorkflowContext } from './WorkflowContext.js';
import { workflowManager, WorkflowManager } from './WorkflowManager.js';

const logger = new LoggerService('ResearchWorkflowEngine');

export class ResearchWorkflowEngine {
  private manager: WorkflowManager;

  constructor(manager: WorkflowManager = workflowManager) {
    this.manager = manager;
  }

  /**
   * Initializes and executes an autonomous scientific research workflow
   */
  public async startWorkflow(config: IWorkflowConfig): Promise<WorkflowContext> {
    logger.info(`ResearchWorkflowEngine starting workflow ${config.workflowId} for research goal "${config.goal.name}"`);
    return this.manager.startWorkflow(config);
  }

  /**
   * Pauses an ongoing workflow
   */
  public async pauseWorkflow(workflowId: string): Promise<boolean> {
    logger.info(`ResearchWorkflowEngine pausing workflow ${workflowId}`);
    return this.manager.pauseWorkflow(workflowId);
  }

  /**
   * Resumes a paused workflow
   */
  public async resumeWorkflow(workflowId: string): Promise<boolean> {
    logger.info(`ResearchWorkflowEngine resuming workflow ${workflowId}`);
    return this.manager.resumeWorkflow(workflowId);
  }

  /**
   * Cancels a running or paused workflow
   */
  public async cancelWorkflow(workflowId: string): Promise<boolean> {
    logger.info(`ResearchWorkflowEngine cancelling workflow ${workflowId}`);
    return this.manager.cancelWorkflow(workflowId);
  }

  /**
   * Restarts a workflow from the initial state
   */
  public async restartWorkflow(workflowId: string): Promise<boolean> {
    logger.info(`ResearchWorkflowEngine restarting workflow ${workflowId}`);
    return this.manager.restartWorkflow(workflowId);
  }

  /**
   * Gets current state and status metrics for a workflow
   */
  public getWorkflowStatus(workflowId: string): IWorkflowStatusData | undefined {
    return this.manager.getWorkflowStatus(workflowId);
  }

  /**
   * Gets historical iteration trail for a workflow
   */
  public getWorkflowHistory(workflowId: string): IWorkflowHistoryEntry[] {
    return this.manager.getWorkflowHistory(workflowId);
  }

  /**
   * Lists all workflows managed by the engine
   */
  public listWorkflows(): WorkflowContext[] {
    return this.manager.listAllWorkflows();
  }

  /**
   * Scans and resumes non-terminal workflows from disk persistence
   */
  public async recoverWorkflows(): Promise<void> {
    logger.info('ResearchWorkflowEngine scanning persistent workflows for recovery');
    return this.manager.recoverAllWorkflows();
  }
}

export const researchWorkflowEngine = new ResearchWorkflowEngine();
