import { IARPUnifiedResults } from '../types.js';
import { LoggerService } from '../../logging/logger.js';
import { NotFoundError } from '../../shared/errors.js';

const logger = new LoggerService('ResultStorage');

export class ResultStorageRepository {
  private resultsMap: Map<string, IARPUnifiedResults> = new Map();

  public save(results: IARPUnifiedResults): IARPUnifiedResults {
    this.resultsMap.set(results.id, results);
    logger.info(`Persisted unified ARP results ${results.id} for experiment ${results.experimentId} (Job: ${results.jobId})`);
    return results;
  }

  public findById(id: string): IARPUnifiedResults {
    const res = this.resultsMap.get(id);
    if (!res) {
      throw new NotFoundError(`Unified ARP result with ID "${id}" not found.`);
    }
    return res;
  }

  public findByJobId(jobId: string): IARPUnifiedResults | undefined {
    for (const res of this.resultsMap.values()) {
      if (res.jobId === jobId) return res;
    }
    return undefined;
  }

  public findByExperimentId(experimentId: string): IARPUnifiedResults[] {
    const list: IARPUnifiedResults[] = [];
    for (const res of this.resultsMap.values()) {
      if (res.experimentId === experimentId) list.push(res);
    }
    return list;
  }

  public getAll(): IARPUnifiedResults[] {
    return Array.from(this.resultsMap.values());
  }
}

export const resultStorageRepository = new ResultStorageRepository();
