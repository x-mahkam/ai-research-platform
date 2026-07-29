import { ISchedulerJob } from '../queue/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('WorkerPoolManager');

export interface IWorkerNode {
  id: string;
  name: string;
  host: string;
  status: 'IDLE' | 'BUSY' | 'RECOVERING' | 'OFFLINE';
  assignedJobId?: string;
  cpuCapacityPercent: number;
  memoryCapacityGB: number;
  lastHeartbeat: string;
  tasksCompleted: number;
}

export class WorkerPoolManager {
  private workers: Map<string, IWorkerNode> = new Map();
  private maxConcurrency: number = 4;
  private heartbeatTimeoutMs: number = 30000; // 30s heartbeat threshold

  constructor(initialConcurrency: number = 4) {
    this.maxConcurrency = initialConcurrency;
    this.initializeDefaultPool();
  }

  private initializeDefaultPool(): void {
    this.workers.clear();
    for (let i = 1; i <= this.maxConcurrency; i++) {
      const id = `worker-node-0${i}`;
      this.workers.set(id, {
        id,
        name: `HPC Compute Node 0${i}`,
        host: `node-0${i}.cluster.internal`,
        status: 'IDLE',
        cpuCapacityPercent: 100,
        memoryCapacityGB: 64,
        lastHeartbeat: new Date().toISOString(),
        tasksCompleted: 0,
      });
    }
    logger.info(`Initialized Worker Pool with ${this.workers.size} parallel workers.`);
  }

  public setConcurrency(concurrency: number): void {
    if (concurrency < 1) return;
    this.maxConcurrency = concurrency;

    // Adjust worker pool size
    const currentSize = this.workers.size;
    if (concurrency > currentSize) {
      for (let i = currentSize + 1; i <= concurrency; i++) {
        const id = `worker-node-0${i}`;
        this.workers.set(id, {
          id,
          name: `HPC Compute Node 0${i}`,
          host: `node-0${i}.cluster.internal`,
          status: 'IDLE',
          cpuCapacityPercent: 100,
          memoryCapacityGB: 64,
          lastHeartbeat: new Date().toISOString(),
          tasksCompleted: 0,
        });
      }
    } else if (concurrency < currentSize) {
      // Remove idle workers down to max concurrency
      const keys = Array.from(this.workers.keys());
      for (const key of keys) {
        if (this.workers.size <= concurrency) break;
        const w = this.workers.get(key);
        if (w && w.status === 'IDLE') {
          this.workers.delete(key);
        }
      }
    }
    logger.info(`Worker pool concurrency updated to ${this.workers.size}`);
  }

  public getConcurrency(): number {
    return this.maxConcurrency;
  }

  public getAvailableWorker(): IWorkerNode | undefined {
    for (const worker of this.workers.values()) {
      if (worker.status === 'IDLE') {
        return worker;
      }
    }
    return undefined;
  }

  public assignJob(workerId: string, jobId: string): boolean {
    const worker = this.workers.get(workerId);
    if (!worker || worker.status !== 'IDLE') return false;

    worker.status = 'BUSY';
    worker.assignedJobId = jobId;
    worker.lastHeartbeat = new Date().toISOString();
    logger.info(`Assigned job ${jobId} to worker ${worker.name} (${worker.id})`);
    return true;
  }

  public releaseWorker(workerId: string, success: boolean = true): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'IDLE';
      worker.assignedJobId = undefined;
      worker.lastHeartbeat = new Date().toISOString();
      if (success) {
        worker.tasksCompleted += 1;
      }
      logger.info(`Worker ${worker.id} released and set to IDLE.`);
    }
  }

  public updateHeartbeat(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = new Date().toISOString();
    }
  }

  public detectStaleWorkers(): Array<{ worker: IWorkerNode; orphanedJobId?: string }> {
    const stale: Array<{ worker: IWorkerNode; orphanedJobId?: string }> = [];
    const now = Date.now();

    for (const worker of this.workers.values()) {
      const lastHbTime = new Date(worker.lastHeartbeat).getTime();
      const isExpired = now - lastHbTime > this.heartbeatTimeoutMs;

      if (isExpired && worker.status === 'BUSY') {
        logger.warn(`Worker ${worker.id} is STALE/UNRESPONSIVE! Last heartbeat: ${worker.lastHeartbeat}`);
        stale.push({
          worker: { ...worker },
          orphanedJobId: worker.assignedJobId,
        });
      }
    }

    return stale;
  }

  public recoverWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'IDLE';
      worker.assignedJobId = undefined;
      worker.lastHeartbeat = new Date().toISOString();
      logger.info(`Worker ${workerId} successfully recovered and restored to IDLE status.`);
    }
  }

  public getAllWorkers(): IWorkerNode[] {
    return Array.from(this.workers.values());
  }

  public getActiveCount(): number {
    let count = 0;
    for (const w of this.workers.values()) {
      if (w.status === 'BUSY') count++;
    }
    return count;
  }
}

export const workerPoolManager = new WorkerPoolManager();
