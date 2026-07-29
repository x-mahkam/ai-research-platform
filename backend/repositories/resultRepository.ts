import { BaseRepository } from './baseRepository.js';
import { ResultEntity } from '../entities/index.js';

export interface IResultRepository {
  findAll(): ResultEntity[];
  findById(id: string): ResultEntity | undefined;
  create(result: ResultEntity): ResultEntity;
  findByJobId(jobId: string): ResultEntity | undefined;
  findByExperimentId(experimentId: string): ResultEntity[];
}

export class ResultRepository extends BaseRepository<ResultEntity> implements IResultRepository {
  constructor() {
    super('results');
  }

  public findByJobId(jobId: string): ResultEntity | undefined {
    return this.findAll((r) => r.jobId === jobId)[0];
  }

  public findByExperimentId(experimentId: string): ResultEntity[] {
    return this.findAll((r) => r.experimentId === experimentId);
  }
}

export const resultRepository = new ResultRepository();
