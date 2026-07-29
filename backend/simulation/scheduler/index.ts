import { scheduler } from '../../scheduler/index.js';
import { simulationRepository } from '../../repositories/simulationRepository.js';
import { formatLogTimestamp } from '../../shared/utils.js';

export interface IScheduledQueueItem {
  jobId: string;
  priority: number;
  queuedAt: string;
}

export class SimulationScheduler {
  public enqueue(jobId: string, priority: number = 5): void {
    const job = simulationRepository.findById(jobId);
    scheduler.submitJob({
      jobId,
      experimentId: job?.experimentId || 'exp-001',
      experimentTitle: job?.experimentTitle || 'Sub-10nm Semiconductor Transport Simulation',
      pluginId: job?.pluginId || 'plugin-sentaurus-tcad',
      pluginName: job?.pluginName || 'Sentaurus TCAD Solver',
      priority,
    });

    simulationRepository.appendLog(
      jobId,
      `[${formatLogTimestamp()}] Job queued in enterprise scheduler (Priority: ${priority})`
    );
  }

  public dequeueNext(): string | undefined {
    const state = scheduler.getSchedulerState();
    const queued = state.queue.find((j) => j.status === 'QUEUED');
    return queued?.id;
  }

  public getQueuePosition(jobId: string): number {
    const state = scheduler.getSchedulerState();
    const queued = state.queue.filter((j) => j.status === 'QUEUED');
    const index = queued.findIndex((item) => item.id === jobId);
    return index === -1 ? -1 : index + 1;
  }

  public getQueueLength(): number {
    const state = scheduler.getSchedulerState();
    return state.queue.filter((j) => j.status === 'QUEUED').length;
  }

  public removeFromQueue(jobId: string): boolean {
    return scheduler.cancelJob(jobId);
  }
}

export const simulationScheduler = new SimulationScheduler();
export * from '../../scheduler/index.js';
