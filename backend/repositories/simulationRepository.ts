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
    const logs = [...(job.logs || []), logMessage];
    return this.update(id, { logs }) as SimulationJob;
  }
}

export const simulationRepository = new SimulationRepository();
