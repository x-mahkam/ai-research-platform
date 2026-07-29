import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('WorkflowScheduler');

export class WorkflowScheduler {
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

  public scheduleNextRun(
    workflowId: string,
    delayMs: number,
    callback: () => Promise<void>
  ): void {
    this.cancelScheduledRun(workflowId);

    logger.info(`Scheduling next run for workflow ${workflowId} in ${delayMs}ms`);

    const timer = setTimeout(async () => {
      this.scheduledTasks.delete(workflowId);
      try {
        await callback();
      } catch (err: any) {
        logger.error(`Error executing scheduled workflow callback for ${workflowId}`, { error: err.message });
      }
    }, delayMs);

    this.scheduledTasks.set(workflowId, timer);
  }

  public cancelScheduledRun(workflowId: string): void {
    const timer = this.scheduledTasks.get(workflowId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledTasks.delete(workflowId);
      logger.info(`Cancelled scheduled run for workflow ${workflowId}`);
    }
  }

  public isScheduled(workflowId: string): boolean {
    return this.scheduledTasks.has(workflowId);
  }

  public clearAll(): void {
    for (const [id, timer] of this.scheduledTasks.entries()) {
      clearTimeout(timer);
    }
    this.scheduledTasks.clear();
  }
}

export const workflowScheduler = new WorkflowScheduler();
