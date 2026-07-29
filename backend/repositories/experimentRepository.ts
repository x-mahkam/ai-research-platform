import { BaseRepository } from './baseRepository.js';
import { ExperimentEntity } from '../entities/index.js';
import { Experiment } from '../shared/types.js';

export interface IExperimentRepository {
  findAll(filter?: string | ((item: ExperimentEntity) => boolean)): Experiment[];
  findById(id: string): Experiment | undefined;
  create(experiment: Experiment): Experiment;
  update(id: string, updates: Partial<Experiment>): Experiment | undefined;
}

export class ExperimentRepository extends BaseRepository<ExperimentEntity> implements IExperimentRepository {
  constructor() {
    super('experiments');
  }

  public override findAll(filter?: string | ((item: ExperimentEntity) => boolean)): Experiment[] {
    if (typeof filter === 'string') {
      return this.db.find<ExperimentEntity>('experiments', (e) => e.projectId === filter);
    }
    if (typeof filter === 'function') {
      return this.db.find<ExperimentEntity>('experiments', filter);
    }
    return this.db.find<ExperimentEntity>('experiments');
  }
}

export const experimentRepository = new ExperimentRepository();
