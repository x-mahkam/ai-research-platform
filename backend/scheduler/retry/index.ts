import { ISchedulerJob } from '../queue/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('RetryPolicyManager');

export interface IRetryPolicyConfig {
  defaultMaxRetries: number;
  initialBackoffMs: number;
  backoffMultiplier: number;
}

export class RetryPolicyManager {
  private config: IRetryPolicyConfig;

  constructor(config?: Partial<IRetryPolicyConfig>) {
    this.config = {
      defaultMaxRetries: 3,
      initialBackoffMs: 2000,
      backoffMultiplier: 2,
      ...config,
    };
  }

  public shouldRetry(job: ISchedulerJob): boolean {
    const maxRetries = job.maxRetries ?? this.config.defaultMaxRetries;
    return job.retryCount < maxRetries;
  }

  public calculateBackoffMs(retryAttempt: number): number {
    return this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, retryAttempt);
  }

  public prepareJobForRetry(job: ISchedulerJob, errorReason?: string): { job: ISchedulerJob; delayMs: number } {
    const nextRetryCount = job.retryCount + 1;
    const delayMs = this.calculateBackoffMs(nextRetryCount);

    logger.info(
      `Job ${job.id} failed (Reason: ${errorReason || 'Unknown'}). Scheduling retry #${nextRetryCount}/${job.maxRetries} after ${delayMs}ms delay.`
    );

    const retriedJob: ISchedulerJob = {
      ...job,
      status: 'QUEUED',
      retryCount: nextRetryCount,
      workerId: undefined,
      error: errorReason ? `Retry #${nextRetryCount}: ${errorReason}` : job.error,
      logs: [
        ...(job.logs || []),
        `[RETRY MANAGER] Attempt #${nextRetryCount} triggered after failure: ${errorReason || 'Transient error'}`,
      ],
    };

    return { job: retriedJob, delayMs };
  }
}

export const retryPolicyManager = new RetryPolicyManager();
