import { BaseRepository } from './baseRepository.js';
import { JobEntity } from '../entities/index.js';
import { SimulationJob } from '../shared/types.js';

export interface ISimulationRepository {
  findAll(): SimulationJob[];
  findById(id: string): SimulationJob | undefined;
  create(job: SimulationJob): SimulationJob;
  update(id: string, updates: Partial<SimulationJob>): SimulationJob | undefined;
  appendLog(id: string, logMessage: string): SimulationJob | undefined;
}

export class SimulationRepository extends BaseRepository<JobEntity> implements ISimulationRepository {
  constructor() {
    super('jobs');
  }

  public appendLog(id: string, logMessage: string): SimulationJob | undefined {
    const job = this.findById(id);
    if (!job) return undefined;
    // Keep only the most recent lines. Without this the whole (growing) log
    // array is re-serialized into the record blob on every appended line.
    const MAX_LOG_LINES = 500;
    const logs = [...(job.logs || []), logMessage];
    if (logs.length > MAX_LOG_LINES) logs.splice(0, logs.length - MAX_LOG_LINES);
    return this.update(id, { logs }) as SimulationJob;
  }
}

export const simulationRepository = new SimulationRepository();
