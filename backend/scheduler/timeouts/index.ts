import { ISchedulerJob } from '../queue/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('TimeoutMonitor');

export interface ITimeoutConfig {
  defaultTimeoutSeconds: number;
}

export class TimeoutMonitor {
  private defaultTimeoutSeconds: number = 300; // 5 minutes default

  constructor(defaultTimeoutSeconds: number = 300) {
    this.defaultTimeoutSeconds = defaultTimeoutSeconds;
  }

  public isTimedOut(job: ISchedulerJob, customTimeoutSeconds?: number): boolean {
    if (job.status !== 'RUNNING' || !job.startedAt) return false;

    const timeoutSec = customTimeoutSeconds || this.defaultTimeoutSeconds;
    const startTime = new Date(job.startedAt).getTime();
    const elapsedSec = (Date.now() - startTime) / 1000;

    return elapsedSec > timeoutSec;
  }

  public checkTimedOutJobs(jobs: ISchedulerJob[]): ISchedulerJob[] {
    const timedOut: ISchedulerJob[] = [];

    for (const job of jobs) {
      if (this.isTimedOut(job)) {
        logger.warn(`Job ${job.id} has exceeded execution timeout threshold of ${this.defaultTimeoutSeconds}s!`);
        timedOut.push(job);
      }
    }

    return timedOut;
  }
}

export const timeoutMonitor = new TimeoutMonitor();
