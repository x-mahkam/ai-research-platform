import { jobQueueManager, JobQueueManager, ISchedulerJob, QueuePolicyMode } from './queue/index.js';
import { priorityStrategy, PriorityStrategy, PriorityLevel } from './priority/index.js';
import { retryPolicyManager, RetryPolicyManager } from './retry/index.js';
import { workerPoolManager, WorkerPoolManager } from './workers/index.js';
import { resourceManager, ResourceManager } from './resources/index.js';
import { timeoutMonitor, TimeoutMonitor } from './timeouts/index.js';
import { schedulerHistoryManager, SchedulerHistoryManager } from './history/index.js';
import { experimentRepository } from '../repositories/experimentRepository.js';
import { pluginRepository } from '../repositories/pluginRepository.js';
import { simulationRepository } from '../repositories/simulationRepository.js';
import { LoggerService } from '../logging/logger.js';
import { generateId, formatLogTimestamp } from '../shared/utils.js';

const logger = new LoggerService('EnterpriseScheduler');

export type JobExecutionHandler = (request: { experimentId: string; priority?: number }) => Promise<unknown>;

export * from './queue/index.js';
export * from './priority/index.js';
export * from './retry/index.js';
export * from './workers/index.js';
export * from './resources/index.js';
export * from './timeouts/index.js';
export * from './history/index.js';

export interface ISubmitJobOptions {
  jobId?: string;
  experimentId: string;
  experimentTitle?: string;
  pluginId?: string;
  pluginName?: string;
  priority?: PriorityLevel | number;
  cpuRequired?: number;
  memoryRequiredGB?: number;
  maxRetries?: number;
}

export class Scheduler {
  private queue: JobQueueManager = jobQueueManager;
  private priority: PriorityStrategy = priorityStrategy;
  private retryPolicy: RetryPolicyManager = retryPolicyManager;
  private workerPool: WorkerPoolManager = workerPoolManager;
  private resources: ResourceManager = resourceManager;
  private timeouts: TimeoutMonitor = timeoutMonitor;
  private history: SchedulerHistoryManager = schedulerHistoryManager;
  private executionHandler: JobExecutionHandler | null = null;

  public setExecutionHandler(handler: JobExecutionHandler): void {
    this.executionHandler = handler;
  }

  private isProcessing: boolean = false;
  private watchdogInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startWatchdog();
  }

  /**
   * Enqueue a job into the real Scheduler
   */
  public submitJob(options: ISubmitJobOptions): ISchedulerJob {
    const exp = experimentRepository.findById(options.experimentId);
    const experimentTitle = options.experimentTitle || exp?.title || 'Advanced Semiconductor Simulation';
    const pluginId = options.pluginId || exp?.pluginId || 'plugin-sentaurus-tcad';
    
    let pluginName = options.pluginName;
    if (!pluginName) {
      const pl = pluginRepository.findById(pluginId);
      pluginName = pl?.name || 'Sentaurus TCAD Solver';
    }

    const priorityScore = this.priority.getNumericPriority(options.priority || 'MEDIUM');
    const priorityLevelName = this.priority.getPriorityLevelName(priorityScore);

    const jobId = options.jobId || generateId('job');
    const newJob: ISchedulerJob = {
      id: jobId,
      experimentId: options.experimentId,
      experimentTitle,
      pluginId,
      pluginName,
      priority: priorityScore,
      priorityLevel: priorityLevelName,
      status: 'QUEUED',
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      cpuRequired: options.cpuRequired ?? 25,
      memoryRequiredGB: options.memoryRequiredGB ?? 8,
      logs: [
        `[${formatLogTimestamp()}] Job enqueued in Enterprise Scheduler (Priority: ${priorityLevelName}/${priorityScore})`,
      ],
    };

    // Store in Simulation Repository for UI & API compatibility if not already present
    if (!simulationRepository.findById(jobId)) {
      simulationRepository.create({
        id: jobId,
        experimentId: options.experimentId,
        experimentTitle,
        pluginId,
        pluginName,
        status: 'Queued',
        progress: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        hostMachine: 'Pending Scheduling',
        logs: newJob.logs,
      } as any);
    }

    this.queue.enqueue(newJob);
    this.history.recordEvent(
      'ENQUEUED',
      `Enqueued job ${jobId} for experiment "${experimentTitle}" with priority ${priorityLevelName}`,
      jobId,
      { priority: priorityScore, pluginId }
    );

    // Kick off dispatch loop
    this.dispatchLoopAsync();

    return newJob;
  }

  /**
   * Pause the scheduler queue
   */
  public pauseQueue(): void {
    this.queue.pauseQueue();
    this.history.recordEvent('PAUSED', 'Job execution queue paused by administrator.');
  }

  /**
   * Resume the scheduler queue
   */
  public resumeQueue(): void {
    this.queue.resumeQueue();
    this.history.recordEvent('RESUMED', 'Job execution queue resumed.');
    this.dispatchLoopAsync();
  }

  /**
   * Set scheduler mode (FIFO vs Priority)
   */
  public setPolicyMode(mode: QueuePolicyMode): void {
    this.queue.setPolicyMode(mode);
    this.history.recordEvent('POLICY_CHANGED', `Scheduler policy updated to ${mode}`);
    this.dispatchLoopAsync();
  }

  /**
   * Set worker pool parallel concurrency limit
   */
  public setConcurrency(concurrency: number): void {
    this.workerPool.setConcurrency(concurrency);
    this.history.recordEvent('CONCURRENCY_CHANGED', `Parallel worker pool concurrency set to ${concurrency}`);
    this.dispatchLoopAsync();
  }

  /**
   * Cancel a job in queue or execution
   */
  public cancelJob(jobId: string): boolean {
    const job = this.queue.findJob(jobId);
    if (!job) {
      // Check simulation repository
      simulationRepository.update(jobId, { status: 'Cancelled' });
      return false;
    }

    if (job.status === 'RUNNING' && job.workerId) {
      this.workerPool.releaseWorker(job.workerId, false);
      this.resources.release(job);
    }

    this.queue.updateJobStatus(jobId, 'CANCELLED', {
      completedAt: new Date().toISOString(),
      error: 'Job manually cancelled by user',
    });

    simulationRepository.update(jobId, { status: 'Cancelled' });
    simulationRepository.appendLog(jobId, `[${formatLogTimestamp()}] Job manually cancelled.`);

    this.history.recordEvent('CANCELLED', `Job ${jobId} was manually cancelled.`, jobId);
    return true;
  }

  /**
   * Manually retry a failed or cancelled job
   */
  public retryJob(jobId: string): boolean {
    const job = this.queue.findJob(jobId) || (simulationRepository.findById(jobId) as any);
    if (!job) return false;

    const retried: ISchedulerJob = {
      ...job,
      status: 'QUEUED',
      queuedAt: new Date().toISOString(),
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
      logs: [...(job.logs || []), `[${formatLogTimestamp()}] Job manually restarted/retried by user.`],
    };

    simulationRepository.update(jobId, {
      status: 'Queued',
      progress: 0,
      error: undefined,
    });
    simulationRepository.appendLog(jobId, `[${formatLogTimestamp()}] Job re-queued for execution.`);

    this.queue.enqueue(retried);
    this.history.recordEvent('RETRIED', `Job ${jobId} manually re-queued for execution.`, jobId);

    this.dispatchLoopAsync();
    return true;
  }

  /**
   * Trigger worker recovery (detect crashed or stale worker nodes and reclaim jobs)
   */
  public recoverStaleWorkers(): void {
    const staleList = this.workerPool.detectStaleWorkers();
    for (const item of staleList) {
      const { worker, orphanedJobId } = item;
      logger.warn(`Recovering crashed worker node ${worker.id} (${worker.name})`);

      if (orphanedJobId) {
        const job = this.queue.findJob(orphanedJobId);
        if (job) {
          this.resources.release(job);
          if (this.retryPolicy.shouldRetry(job)) {
            const { job: retriedJob } = this.retryPolicy.prepareJobForRetry(
              job,
              `Worker ${worker.id} lost heartbeat`
            );
            this.queue.enqueue(retriedJob);
            this.history.recordEvent(
              'RECOVERED',
              `Reclaimed job ${job.id} from failed worker ${worker.id} and re-queued for retry.`,
              job.id
            );
          } else {
            this.queue.updateJobStatus(job.id, 'FAILED', {
              error: `Worker ${worker.id} crashed and max retries exhausted.`,
            });
            this.history.recordEvent(
              'FAILED',
              `Job ${job.id} failed after worker node crash (Max retries reached).`,
              job.id
            );
          }
        }
      }

      this.workerPool.recoverWorker(worker.id);
    }
  }

  /**
   * Main dispatch loop that pops jobs, checks resources, assigns workers, and invokes Simulation Engine
   */
  public async tick(): Promise<void> {
    if (this.isProcessing || this.queue.isQueuePaused()) return;
    this.isProcessing = true;

    try {
      while (!this.queue.isQueuePaused()) {
        const availableWorker = this.workerPool.getAvailableWorker();
        if (!availableWorker) break;

        const nextJob = this.queue.dequeueNext();
        if (!nextJob) break;

        // Check resources
        if (!this.resources.hasAvailableResources(nextJob.cpuRequired, nextJob.memoryRequiredGB)) {
          // Re-enqueue job if resources insufficient
          nextJob.logs.push(`[${formatLogTimestamp()}] Waiting for cluster compute resources...`);
          this.queue.enqueue(nextJob);
          break;
        }

        // Assign worker & allocate resources
        this.workerPool.assignJob(availableWorker.id, nextJob.id);
        this.resources.allocate(nextJob);

        nextJob.status = 'RUNNING';
        nextJob.workerId = availableWorker.id;
        nextJob.startedAt = new Date().toISOString();
        nextJob.logs.push(
          `[${formatLogTimestamp()}] Dispatched to worker node ${availableWorker.name} (${availableWorker.host})`
        );

        this.queue.updateJobStatus(nextJob.id, 'RUNNING', nextJob);
        simulationRepository.update(nextJob.id, {
          status: 'Running',
          hostMachine: availableWorker.host,
          cpuUsage: nextJob.cpuRequired || 100,
          memoryUsage: nextJob.memoryRequiredGB,
        });

        this.history.recordEvent(
          'DISPATCHED',
          `Dispatched job ${nextJob.id} to ${availableWorker.name}`,
          nextJob.id,
          { workerId: availableWorker.id, host: availableWorker.host }
        );

        // Execute asynchronously via Simulation Engine (Scheduler communicates ONLY with Simulation Engine)
        this.executeViaSimulationEngineAsync(nextJob, availableWorker.id);
      }
    } catch (err: any) {
      logger.error(`Error in scheduler dispatch loop: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeViaSimulationEngineAsync(job: ISchedulerJob, workerId: string): Promise<void> {
    try {
      if (this.executionHandler) {
        await this.executionHandler({
          experimentId: job.experimentId,
          priority: job.priority,
        });
      }

      // Update successful execution
      this.queue.updateJobStatus(job.id, 'COMPLETED', {
        completedAt: new Date().toISOString(),
      });
      this.history.recordEvent('COMPLETED', `Job ${job.id} completed successfully via Simulation Engine.`, job.id);
      this.workerPool.releaseWorker(workerId, true);
      this.resources.release(job);
    } catch (err: any) {
      logger.error(`Execution failed for job ${job.id}: ${err.message}`);

      this.workerPool.releaseWorker(workerId, false);
      this.resources.release(job);

      if (this.retryPolicy.shouldRetry(job)) {
        const { job: retriedJob, delayMs } = this.retryPolicy.prepareJobForRetry(job, err.message);
        this.history.recordEvent(
          'RETRIED',
          `Job ${job.id} execution failed (${err.message}). Retrying in ${delayMs}ms...`,
          job.id
        );

        setTimeout(() => {
          this.queue.enqueue(retriedJob);
          this.dispatchLoopAsync();
        }, delayMs);
      } else {
        this.queue.updateJobStatus(job.id, 'FAILED', {
          completedAt: new Date().toISOString(),
          error: err.message,
        });
        this.history.recordEvent(
          'FAILED',
          `Job ${job.id} permanently failed: ${err.message} (Max retries reached)`,
          job.id
        );
      }
    } finally {
      this.dispatchLoopAsync();
    }
  }

  private dispatchLoopAsync(): void {
    setImmediate(() => this.tick());
  }

  private startWatchdog(): void {
    if (this.watchdogInterval) return;
    // Watchdog runs every 10s to check timeouts and worker heartbeats
    this.watchdogInterval = setInterval(() => {
      this.recoverStaleWorkers();

      const runningJobs = this.queue.getQueue().filter((j) => j.status === 'RUNNING');
      const timedOut = this.timeouts.checkTimedOutJobs(runningJobs);

      for (const job of timedOut) {
        logger.warn(`Watchdog terminating timed-out job ${job.id}`);
        this.history.recordEvent('TIMED_OUT', `Job ${job.id} exceeded maximum execution timeout limit.`, job.id);
        this.cancelJob(job.id);
      }

      this.tick();
    }, 10000);
  }

  public getSchedulerState() {
    return {
      queue: this.queue.getQueue(),
      policyMode: this.queue.getPolicyMode(),
      isPaused: this.queue.isQueuePaused(),
      workers: this.workerPool.getAllWorkers(),
      concurrency: this.workerPool.getConcurrency(),
      activeWorkerCount: this.workerPool.getActiveCount(),
      resources: this.resources.getQuota(),
      history: this.history.getHistory(),
    };
  }
}

export const scheduler = new Scheduler();
