import { ISimulationHistoryRecord } from '../types.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('SimulationHistory');

export class SimulationHistoryRepository {
  private records: Map<string, ISimulationHistoryRecord> = new Map();

  public recordHistory(record: ISimulationHistoryRecord): ISimulationHistoryRecord {
    this.records.set(record.id, record);
    logger.info(`Recorded simulation history entry ${record.id} for job ${record.jobId}`);
    return record;
  }

  public getHistoryByJob(jobId: string): ISimulationHistoryRecord | undefined {
    for (const record of this.records.values()) {
      if (record.jobId === jobId) return record;
    }
    return undefined;
  }

  public getHistoryByExperiment(experimentId: string): ISimulationHistoryRecord[] {
    const list: ISimulationHistoryRecord[] = [];
    for (const record of this.records.values()) {
      if (record.experimentId === experimentId) list.push(record);
    }
    return list;
  }

  public getAllHistory(): ISimulationHistoryRecord[] {
    return Array.from(this.records.values());
  }
}

export const simulationHistoryRepository = new SimulationHistoryRepository();
