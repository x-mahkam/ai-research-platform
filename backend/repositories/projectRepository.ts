import { BaseRepository } from './baseRepository.js';
import { ProjectEntity } from '../entities/index.js';
import { Project } from '../shared/types.js';

export interface IProjectRepository {
  findAll(): Project[];
  findById(id: string): Project | undefined;
  create(project: Project): Project;
  update(id: string, updates: Partial<Project>): Project | undefined;
  delete(id: string): boolean;
  incrementExperimentCount(id: string): void;
}

export class ProjectRepository extends BaseRepository<ProjectEntity> implements IProjectRepository {
  constructor() {
    super('projects');
  }

  public incrementExperimentCount(id: string): void {
    const proj = this.findById(id);
    if (proj) {
      this.update(id, { experimentCount: (proj.experimentCount || 0) + 1 });
    }
  }
}

export const projectRepository = new ProjectRepository();
