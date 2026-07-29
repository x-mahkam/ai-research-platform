import { dbStore, InMemoryDataStore } from '../database/dataStore.js';
import { OptimizationJob } from '../shared/types.js';

export interface IOptimizationRepository {
  findAll(): OptimizationJob[];
  findById(id: string): OptimizationJob | undefined;
  create(job: OptimizationJob): OptimizationJob;
  update(id: string, updates: Partial<OptimizationJob>): OptimizationJob;
}

export class OptimizationRepository implements IOptimizationRepository {
  constructor(private store: InMemoryDataStore = dbStore) {}

  public findAll(): OptimizationJob[] {
    return this.store.getOptimizationJobs();
  }

  public findById(id: string): OptimizationJob | undefined {
    return this.store.getOptimizationJobById(id);
  }

  public create(job: OptimizationJob): OptimizationJob {
    return this.store.addOptimizationJob(job);
  }

  public update(id: string, updates: Partial<OptimizationJob>): OptimizationJob {
    const updated = this.store.updateOptimizationJob(id, updates);
    if (!updated) {
      throw new Error(`Failed to update optimization job with id "${id}"`);
    }
    return updated;
  }
}

export const optimizationRepository = new OptimizationRepository();
