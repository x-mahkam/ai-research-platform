import { IWorkerNode } from '../types.js';
import { LoggerService } from '../../logging/logger.js';
import { config } from '../../configuration/index.js';
import { simulationRepository } from '../../repositories/simulationRepository.js';
import { formatLogTimestamp } from '../../shared/utils.js';

const logger = new LoggerService('WorkerManager');

export class WorkerManager {
  private workers: Map<string, IWorkerNode> = new Map();

  constructor() {
    this.seedDefaultWorkers();
  }

  private seedDefaultWorkers(): void {
    const defaultWorker: IWorkerNode = {
      id: 'worker-node-01',
      hostname: config.simulation.defaultHostMachine,
      status: 'IDLE',
      maxConcurrentJobs: 4,
      activeJobs: [],
      cpuUsagePct: 12.5,
      memoryUsageGb: 4.2,
      lastHeartbeat: new Date().toISOString(),
    };

    const backupWorker: IWorkerNode = {
      id: 'worker-node-02',
      hostname: 'node-compute-03.arp.local',
      status: 'IDLE',
      maxConcurrentJobs: 8,
      activeJobs: [],
      cpuUsagePct: 5.0,
      memoryUsageGb: 2.1,
      lastHeartbeat: new Date().toISOString(),
    };

    this.workers.set(defaultWorker.id, defaultWorker);
    this.workers.set(backupWorker.id, backupWorker);
  }

  public assignWorker(jobId: string): IWorkerNode {
    // Find available worker with lowest load
    let selectedWorker: IWorkerNode | null = null;

    for (const worker of this.workers.values()) {
      if (
        worker.status !== 'OFFLINE' &&
        worker.activeJobs.length < worker.maxConcurrentJobs
      ) {
        if (!selectedWorker || worker.activeJobs.length < selectedWorker.activeJobs.length) {
          selectedWorker = worker;
        }
      }
    }

    if (!selectedWorker) {
      // Fallback to first worker if all busy
      selectedWorker = Array.from(this.workers.values())[0];
    }

    selectedWorker.activeJobs.push(jobId);
    selectedWorker.status = selectedWorker.activeJobs.length >= selectedWorker.maxConcurrentJobs ? 'BUSY' : 'IDLE';

    simulationRepository.update(jobId, { hostMachine: selectedWorker.hostname });
    simulationRepository.appendLog(
      jobId,
      `[${formatLogTimestamp()}] Assigned job to compute node "${selectedWorker.hostname}" (${selectedWorker.id})`
    );

    logger.info(`Assigned job ${jobId} to worker ${selectedWorker.id} (${selectedWorker.hostname})`);
    return selectedWorker;
  }

  public releaseWorker(workerId: string, jobId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.activeJobs = worker.activeJobs.filter((id) => id !== jobId);
      if (worker.activeJobs.length < worker.maxConcurrentJobs) {
        worker.status = 'IDLE';
      }
      logger.info(`Released job ${jobId} from worker ${workerId}`);
    }
  }

  public getAllWorkers(): IWorkerNode[] {
    return Array.from(this.workers.values());
  }

  public registerWorker(node: IWorkerNode): void {
    this.workers.set(node.id, node);
    logger.info(`Registered worker node ${node.id} (${node.hostname})`);
  }
}

export const workerManager = new WorkerManager();
