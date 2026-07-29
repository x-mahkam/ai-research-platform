import { BaseRepository } from './baseRepository.js';
import { JobEntity } from '../entities/index.js';

export interface IJobRepository {
  findAll(): JobEntity[];
  findById(id: string): JobEntity | undefined;
  create(job: JobEntity): JobEntity;
  update(id: string, updates: Partial<JobEntity>): JobEntity | undefined;
  delete(id: string): boolean;
  findByExperimentId(experimentId: string): JobEntity[];
}

export class JobRepository extends BaseRepository<JobEntity> implements IJobRepository {
  constructor() {
    super('jobs');
  }

  public findByExperimentId(experimentId: string): JobEntity[] {
    return this.findAll((j) => j.experimentId === experimentId);
  }
}

export const jobRepository = new JobRepository();
