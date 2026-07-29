import { SimulationJob } from '../../shared/types.js';
import { simulationRepository } from '../../repositories/simulationRepository.js';
import { simulationLifecycleManager } from '../lifecycle/index.ts';
import { SimulationLifecycleState } from '../types.js';

export interface ISimulationStatusReport {
  jobId: string;
  experimentId: string;
  lifecycleState: SimulationLifecycleState;
  progress: number;
  hostMachine: string;
  cpuUsage: number;
  memoryUsage: number;
  startTime?: string;
  endTime?: string;
  lastLog?: string;
}

export class SimulationStatusTracker {
  public getStatus(jobId: string): ISimulationStatusReport | undefined {
    const job = simulationRepository.findById(jobId);
    if (!job) return undefined;

    const lifecycleState = simulationLifecycleManager.getState(jobId) || 'CREATED';

    return {
      jobId: job.id,
      experimentId: job.experimentId,
      lifecycleState,
      progress: job.progress,
      hostMachine: job.hostMachine,
      cpuUsage: job.cpuUsage,
      memoryUsage: job.memoryUsage,
      startTime: job.startTime,
      endTime: job.endTime,
      lastLog: job.logs.length > 0 ? job.logs[job.logs.length - 1] : undefined,
    };
  }

  public updateJobProgress(jobId: string, progress: number): void {
    simulationRepository.update(jobId, { progress });
  }

  public getAllActiveStatuses(): ISimulationStatusReport[] {
    const jobs = simulationRepository.findAll();
    return jobs
      .map((j) => this.getStatus(j.id))
      .filter((s): s is ISimulationStatusReport => s !== undefined);
  }
}

export const simulationStatusTracker = new SimulationStatusTracker();
