import { persistentDbEngine, PersistentDatabaseEngine } from '../../database/engine.js';
import { LoggerService } from '../../logging/logger.js';
import { generateId } from '../../shared/utils.js';

const logger = new LoggerService('SchedulerHistoryManager');

export type SchedulerEventType =
  | 'ENQUEUED'
  | 'DISPATCHED'
  | 'PAUSED'
  | 'RESUMED'
  | 'CANCELLED'
  | 'RETRIED'
  | 'RECOVERED'
  | 'TIMED_OUT'
  | 'COMPLETED'
  | 'FAILED'
  | 'CONCURRENCY_CHANGED'
  | 'POLICY_CHANGED';

export interface ISchedulerHistoryEntry {
  id: string;
  jobId?: string;
  eventType: SchedulerEventType;
  description: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export class SchedulerHistoryManager {
  constructor(private db: PersistentDatabaseEngine = persistentDbEngine) {}

  public recordEvent(
    eventType: SchedulerEventType,
    description: string,
    jobId?: string,
    details?: Record<string, unknown>
  ): ISchedulerHistoryEntry {
    const entry: ISchedulerHistoryEntry = {
      id: generateId('sch-hist'),
      jobId,
      eventType,
      description,
      details,
      timestamp: new Date().toISOString(),
    };

    try {
      this.db.insert('scheduler_history' as any, entry as any);
    } catch (err: any) {
      logger.error(`Failed to record scheduler history event: ${err.message}`);
    }

    logger.info(`[Scheduler Event: ${eventType}] ${description}`);
    return entry;
  }

  public getHistory(jobId?: string, limit: number = 50): ISchedulerHistoryEntry[] {
    try {
      const all = this.db.find<ISchedulerHistoryEntry>('scheduler_history' as any);
      let filtered = all;
      if (jobId) {
        filtered = all.filter((h) => h.jobId === jobId);
      }
      return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
    } catch {
      return [];
    }
  }
}

export const schedulerHistoryManager = new SchedulerHistoryManager();
