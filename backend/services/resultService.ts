import { resultRepository, IResultRepository } from '../repositories/resultRepository.js';
import { ResultEntity } from '../entities/index.js';
import { NotFoundError } from '../shared/errors.js';
import { generateId } from '../shared/utils.js';

export class ResultService {
  constructor(private repo: IResultRepository = resultRepository) {}

  public getResults(): ResultEntity[] {
    return this.repo.findAll();
  }

  public getResultByJobId(jobId: string): ResultEntity {
    const res = this.repo.findByJobId(jobId);
    if (!res) {
      throw new NotFoundError(`Results for job ${jobId} not found.`);
    }
    return res;
  }

  public createResult(data: Omit<ResultEntity, 'id'>): ResultEntity {
    const result: ResultEntity = {
      id: generateId('res'),
      ...data,
      createdAt: new Date().toISOString(),
    };
    return this.repo.create(result);
  }
}

export const resultService = new ResultService();
