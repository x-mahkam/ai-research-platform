import { ISchedulerJob } from '../queue/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('PriorityStrategy');

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export class PriorityStrategy {
  public static readonly PRIORITY_MAP: Record<PriorityLevel, number> = {
    CRITICAL: 10,
    HIGH: 8,
    MEDIUM: 5,
    LOW: 2,
  };

  public getNumericPriority(level: PriorityLevel | string | number): number {
    if (typeof level === 'number') return level;
    if (typeof level === 'string') {
      const uppercase = level.toUpperCase() as PriorityLevel;
      if (PriorityStrategy.PRIORITY_MAP[uppercase]) {
        return PriorityStrategy.PRIORITY_MAP[uppercase];
      }
      const parsed = parseInt(level, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return PriorityStrategy.PRIORITY_MAP.MEDIUM;
  }

  public getPriorityLevelName(score: number): PriorityLevel {
    if (score >= 9) return 'CRITICAL';
    if (score >= 7) return 'HIGH';
    if (score >= 4) return 'MEDIUM';
    return 'LOW';
  }

  public compare(a: ISchedulerJob, b: ISchedulerJob, mode: 'FIFO' | 'PRIORITY'): number {
    if (mode === 'FIFO') {
      return a.queuedAt.localeCompare(b.queuedAt);
    }
    // PRIORITY mode
    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;
    return a.queuedAt.localeCompare(b.queuedAt);
  }

  public rePrioritize(job: ISchedulerJob, newLevel: PriorityLevel | number): ISchedulerJob {
    const numeric = this.getNumericPriority(newLevel);
    const levelName = this.getPriorityLevelName(numeric);

    logger.info(`Updating job ${job.id} priority from ${job.priorityLevel} (${job.priority}) to ${levelName} (${numeric})`);

    return {
      ...job,
      priority: numeric,
      priorityLevel: levelName,
    };
  }
}

export const priorityStrategy = new PriorityStrategy();
