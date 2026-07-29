import { LoggerService } from '../logging/logger.js';
import { executionQueue, ExecutionQueue } from './ExecutionQueue.js';
import { resourceScheduler, ResourceScheduler } from './ResourceScheduler.js';
import { workerAgent, WorkerAgent } from './WorkerAgent.js';

const logger = new LoggerService('ExecutionDispatcher');

export class ExecutionDispatcher {
  private queue: ExecutionQueue;
  private scheduler: ResourceScheduler;
  private worker: WorkerAgent;
  private dispatchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    queue: ExecutionQueue = executionQueue,
    scheduler: ResourceScheduler = resourceScheduler,
    worker: WorkerAgent = workerAgent
  ) {
    this.queue = queue;
    this.scheduler = scheduler;
    this.worker = worker;
  }

  public startDispatcher(intervalMs = 500): void {
    if (this.dispatchTimer) clearInterval(this.dispatchTimer);

    logger.info(`Starting ExecutionDispatcher loop (interval: ${intervalMs}ms)`);
    this.dispatchTimer = setInterval(() => {
      this.processQueue().catch((err) => {
        logger.error('Error during execution dispatcher processing cycle', { error: err.message });
      });
    }, intervalMs);
  }

  public stopDispatcher(): void {
    if (this.dispatchTimer) {
      clearInterval(this.dispatchTimer);
      this.dispatchTimer = null;
      logger.info('Stopped ExecutionDispatcher');
    }
  }

  /**
   * Processes the queue by matching queued jobs with available nodes.
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.size > 0) {
        const candidateJob = this.queue.peek();
        if (!candidateJob) break;

        // Ask scheduler to find best node
        const decision = this.scheduler.selectBestNode(candidateJob.request);
        if (!decision.selectedNode) {
          // No node currently available for top priority job. Break loop and wait for next tick.
          logger.debug(
            `No available node found for job [${candidateJob.id}]. Waiting for node availability.`
          );
          break;
        }

        // Dequeue job and assign to selected node
        const job = this.queue.dequeue();
        if (!job) break;

        const node = decision.selectedNode;
        node.assignJob(
          job.id,
          job.request.requiredCores || 1,
          job.request.requiredMemoryMb || 1024
        );
        this.queue.markRunning(job.id, node.id);

        // Dispatch execution asynchronously
        this.dispatchJobToWorker(job.id, node, job.request).catch((err) => {
          logger.error(`Error executing job [${job.id}] on node [${node.id}]: ${err.message}`);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async dispatchJobToWorker(
    jobId: string,
    node: any,
    request: any
  ): Promise<void> {
    try {
      logger.info(`Dispatching Job [${jobId}] to Node [${node.id}]`);
      const result = await this.worker.execute(node, request, jobId);

      // Release node capacity
      node.releaseJob(
        jobId,
        request.requiredCores || 1,
        request.requiredMemoryMb || 1024
      );

      // Handle Result Status
      if (result.status === 'Completed') {
        this.queue.markCompleted(jobId, result);
      } else {
        // Retry logic on failure
        const job = this.queue.getJob(jobId);
        if (job && job.retryCount < job.maxRetries) {
          logger.warn(`Job [${jobId}] failed with status [${result.status}]. Moving job for retry...`);
          this.queue.requeue(jobId, `Execution failed on node ${node.id}: ${result.errorMessage || result.status}`);
        } else {
          this.queue.markCompleted(jobId, result);
        }
      }
    } catch (err: any) {
      logger.error(`WorkerAgent execution failed for Job [${jobId}] on Node [${node.id}]: ${err.message}`);

      node.releaseJob(
        jobId,
        request.requiredCores || 1,
        request.requiredMemoryMb || 1024
      );

      const job = this.queue.getJob(jobId);
      if (job && job.retryCount < job.maxRetries) {
        logger.warn(`Moving failed job [${jobId}] to queue for re-assignment...`);
        this.queue.requeue(jobId, `Node failure/error: ${err.message}`);
      } else {
        this.queue.markCompleted(jobId, {
          exitCode: -1,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMs: 0,
          stdout: '',
          stderr: `Execution error on node ${node.id}: ${err.message}`,
          status: 'Failed',
          errorMessage: err.message,
          executedOnNodeId: node.id,
        });
      }
    }
  }
}

export const executionDispatcher = new ExecutionDispatcher();
