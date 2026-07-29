import { LoggerService } from '../logging/logger.js';
import { IDistributedJob } from './types.js';

const logger = new LoggerService('ExecutionQueue');

export class ExecutionQueue {
  private queue: IDistributedJob[] = [];
  private running: Map<string, IDistributedJob> = new Map();
  private completed: Map<string, IDistributedJob> = new Map();
  private knownHashes: Set<string> = new Set();

  public enqueue(job: IDistributedJob): boolean {
    // Check for duplicate job execution hash to ensure jobs are never duplicated
    if (this.knownHashes.has(job.hash) && job.jobType !== 'Single') {
      logger.warn(`ExecutionQueue duplicate job suppressed with hash [${job.hash}] (Job ID: ${job.id})`);
      return false;
    }

    this.knownHashes.add(job.hash);
    job.status = 'Queued';

    this.queue.push(job);
    // Sort by priority (ascending number: 1 = high priority, 10 = low priority)
    this.queue.sort((a, b) => a.priority - b.priority);

    logger.debug(`Enqueued Job [${job.id}] (Type: ${job.jobType}, Priority: ${job.priority}). Queue length: ${this.queue.length}`);
    return true;
  }

  public enqueueBatch(jobs: IDistributedJob[]): number {
    let addedCount = 0;
    for (const job of jobs) {
      if (this.enqueue(job)) {
        addedCount++;
      }
    }
    logger.info(`EnqueueBatch added ${addedCount}/${jobs.length} jobs to queue. Total queued: ${this.queue.length}`);
    return addedCount;
  }

  public dequeue(): IDistributedJob | undefined {
    const job = this.queue.shift();
    if (job) {
      job.status = 'Preparing';
      this.running.set(job.id, job);
    }
    return job;
  }

  public peek(): IDistributedJob | undefined {
    return this.queue[0];
  }

  public markRunning(jobId: string, nodeId: string): void {
    const job = this.running.get(jobId);
    if (job) {
      job.status = 'Running';
      job.assignedNodeId = nodeId;
      job.startedAt = new Date().toISOString();
    }
  }

  public markCompleted(jobId: string, result: IDistributedJob['result']): void {
    const job = this.running.get(jobId);
    if (job) {
      job.status = result?.status === 'Completed' ? 'Completed' : 'Failed';
      job.result = result;
      job.completedAt = new Date().toISOString();
      this.running.delete(jobId);
      this.completed.set(jobId, job);
      logger.info(`Job [${jobId}] completed with status [${job.status}]`);
    }
  }

  public requeue(jobId: string, reason?: string): boolean {
    const job = this.running.get(jobId);
    if (job) {
      this.running.delete(jobId);
      job.status = 'Queued';
      job.assignedNodeId = undefined;
      job.retryCount += 1;
      this.queue.unshift(job); // High priority requeue
      logger.warn(`Requeued Job [${jobId}] (Attempt ${job.retryCount}/${job.maxRetries}). Reason: ${reason}`);
      return true;
    }
    return false;
  }

  public cancel(jobId: string): boolean {
    // Check in queue
    const queueIdx = this.queue.findIndex((j) => j.id === jobId);
    if (queueIdx !== -1) {
      const [removed] = this.queue.splice(queueIdx, 1);
      removed.status = 'Cancelled';
      this.completed.set(jobId, removed);
      this.knownHashes.delete(removed.hash);
      logger.info(`Cancelled queued Job [${jobId}]`);
      return true;
    }

    // Check in running
    const runningJob = this.running.get(jobId);
    if (runningJob) {
      runningJob.status = 'Cancelled';
      this.running.delete(jobId);
      this.completed.set(jobId, runningJob);
      this.knownHashes.delete(runningJob.hash);
      logger.info(`Cancelled running Job [${jobId}]`);
      return true;
    }

    return false;
  }

  public getJob(jobId: string): IDistributedJob | undefined {
    return (
      this.queue.find((j) => j.id === jobId) ||
      this.running.get(jobId) ||
      this.completed.get(jobId)
    );
  }

  public getQueuedJobs(): IDistributedJob[] {
    return [...this.queue];
  }

  public getRunningJobs(): IDistributedJob[] {
    return Array.from(this.running.values());
  }

  public getCompletedJobs(): IDistributedJob[] {
    return Array.from(this.completed.values());
  }

  public get size(): number {
    return this.queue.length;
  }

  public get runningSize(): number {
    return this.running.size;
  }

  public clear(): void {
    this.queue = [];
    this.running.clear();
    this.completed.clear();
    this.knownHashes.clear();
  }
}

export const executionQueue = new ExecutionQueue();
