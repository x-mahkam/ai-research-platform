import { persistentDbEngine, PersistentDatabaseEngine } from '../../database/engine.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('JobQueueManager');

export type QueuePolicyMode = 'FIFO' | 'PRIORITY';

export interface ISchedulerJob {
  id: string;
  experimentId: string;
  experimentTitle: string;
  pluginId: string;
  pluginName: string;
  priority: number;
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  workerId?: string;
  cpuRequired: number;
  memoryRequiredGB: number;
  error?: string;
  logs: string[];
}

export class JobQueueManager {
  private queue: ISchedulerJob[] = [];
  private mode: QueuePolicyMode = 'PRIORITY';
  private isPaused: boolean = false;

  constructor(private db: PersistentDatabaseEngine = persistentDbEngine) {
    this.restoreFromPersistence();
  }

  public enqueue(job: ISchedulerJob): void {
    const existingIndex = this.queue.findIndex((j) => j.id === job.id);
    if (existingIndex !== -1) {
      this.queue[existingIndex] = { ...this.queue[existingIndex], ...job };
    } else {
      this.queue.push(job);
    }

    this.sortQueue();
    this.persistQueue();
    logger.info(`Enqueued job ${job.id} [${job.priorityLevel}]. Queue size: ${this.queue.length}`);
  }

  public dequeueNext(): ISchedulerJob | undefined {
    if (this.isPaused) {
      logger.info('Queue is paused. Cannot dequeue.');
      return undefined;
    }

    const nextJobIndex = this.queue.findIndex((j) => j.status === 'QUEUED');
    if (nextJobIndex === -1) return undefined;

    const [job] = this.queue.splice(nextJobIndex, 1);
    this.persistQueue();
    return job;
  }

  public getQueue(): ISchedulerJob[] {
    return [...this.queue];
  }

  public findJob(jobId: string): ISchedulerJob | undefined {
    return this.queue.find((j) => j.id === jobId);
  }

  public updateJobStatus(jobId: string, status: ISchedulerJob['status'], extra?: Partial<ISchedulerJob>): void {
    const job = this.findJob(jobId);
    if (job) {
      job.status = status;
      if (extra) {
        Object.assign(job, extra);
      }
      this.persistQueue();
    }
  }

  public removeJob(jobId: string): boolean {
    const initLen = this.queue.length;
    this.queue = this.queue.filter((j) => j.id !== jobId);
    this.persistQueue();
    return this.queue.length < initLen;
  }

  public pauseQueue(): void {
    this.isPaused = true;
    logger.info('Job Queue paused.');
    this.persistQueue();
  }

  public resumeQueue(): void {
    this.isPaused = false;
    logger.info('Job Queue resumed.');
    this.persistQueue();
  }

  public setPolicyMode(mode: QueuePolicyMode): void {
    this.mode = mode;
    this.sortQueue();
    logger.info(`Queue policy changed to: ${mode}`);
    this.persistQueue();
  }

  public getPolicyMode(): QueuePolicyMode {
    return this.mode;
  }

  public isQueuePaused(): boolean {
    return this.isPaused;
  }

  public sortQueue(): void {
    if (this.mode === 'FIFO') {
      this.queue.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
    } else {
      // PRIORITY mode: Higher priority number first, then earlier queuedAt
      this.queue.sort((a, b) => b.priority - a.priority || a.queuedAt.localeCompare(b.queuedAt));
    }
  }

  private persistQueue(): void {
    try {
      this.db.clearCollection('scheduler_queue' as any);
      for (const job of this.queue) {
        this.db.insert('scheduler_queue' as any, job as any);
      }
    } catch (err: any) {
      logger.error(`Failed to persist scheduler queue: ${err.message}`);
    }
  }

  private restoreFromPersistence(): void {
    try {
      const savedJobs = this.db.find<ISchedulerJob>('scheduler_queue' as any);
      if (savedJobs && savedJobs.length > 0) {
        this.queue = savedJobs.map((j) => ({
          ...j,
          // If server restarted while job was running, reset to QUEUED for worker recovery
          status: j.status === 'RUNNING' ? 'QUEUED' : j.status,
        }));
        this.sortQueue();
        logger.info(`Restored ${this.queue.length} jobs from persistent queue store.`);
      }
    } catch {
      // Ignore initial missing collection
    }
  }
}

export const jobQueueManager = new JobQueueManager();
