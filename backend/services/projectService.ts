import { projectRepository, IProjectRepository } from '../repositories/projectRepository.js';
import { Project, ModelFile } from '../shared/types.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';
import { generateId, getCurrentTimestamp } from '../shared/utils.js';
import { eventBus, DomainEventType } from '../events/eventEmitter.js';
import { modelService } from './modelService.js';

export class ProjectService {
  constructor(private repo: IProjectRepository = projectRepository) {}

  private normalizeProject(proj: Project): Project {
    const scientificField = proj.scientificField || proj.domain || 'Semiconductor';
    const simulator = proj.simulator || 'Synopsys Sentaurus TCAD';
    const physicsModule = proj.physicsModule || 'Hydrodynamic';
    const researchGoal = proj.researchGoal || proj.description || 'Scientific simulation & optimization';
    const principalInvestigator = proj.principalInvestigator || proj.owner || 'Local User';
    const models = modelService.getProjectModels(proj.id);
    const defaultModel = models.find((m) => m.isDefault) || models[0];

    return {
      ...proj,
      scientificField,
      simulator,
      physicsModule,
      researchGoal,
      principalInvestigator,
      owner: principalInvestigator,
      domain: scientificField,
      defaultModelId: proj.defaultModelId || defaultModel?.id,
      models,
    };
  }

  public getAllProjects(): Project[] {
    const projects = this.repo.findAll();
    return projects.map((p) => this.normalizeProject(p));
  }

  public getProjectById(id: string): Project {
    const project = this.repo.findById(id);
    if (!project) {
      throw new NotFoundError(`Project with ID ${id} not found.`);
    }
    return this.normalizeProject(project);
  }

  public createProject(
    projectData: Partial<Project> & {
      title?: string;
      name?: string;
      category?: string;
      initialModel?: Partial<ModelFile> & { fileName: string };
    }
  ): Project {
    const title = (projectData.title || projectData.name || '').trim();
    if (!title) {
      throw new ValidationError('Project Title is required.');
    }

    const scientificField = projectData.scientificField || projectData.domain || projectData.category || 'Semiconductor';
    const simulator = projectData.simulator || 'Synopsys Sentaurus TCAD';
    const physicsModule = projectData.physicsModule || 'Hydrodynamic';
    const researchGoal = projectData.researchGoal || projectData.description || 'Scientific investigation';
    const principalInvestigator = projectData.principalInvestigator || projectData.owner || 'Local User';

    const newProject: Project = {
      id: generateId('proj'),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      status: 'Active',
      favorite: false,
      experimentCount: 0,
      title,
      scientificField,
      simulator,
      physicsModule,
      researchGoal,
      description: projectData.description || '',
      principalInvestigator,
      owner: principalInvestigator,
      domain: scientificField,
      tags: projectData.tags && projectData.tags.length > 0 ? projectData.tags : [simulator, physicsModule],
      members: projectData.members || [principalInvestigator],
    };

    const created = this.repo.create(newProject);

    // Create initial model if provided
    let createdModel: ModelFile | null = null;
    if (projectData.initialModel && projectData.initialModel.fileName) {
      createdModel = modelService.createModel(created.id, {
        ...projectData.initialModel,
        simulator: projectData.initialModel.simulator || simulator,
        physicsModule: projectData.initialModel.physicsModule || physicsModule,
        isDefault: true,
      });

      this.repo.update(created.id, { defaultModelId: createdModel.id });
    }

    eventBus.emitDomainEvent(DomainEventType.PROJECT_CREATED, created);
    return this.getProjectById(created.id);
  }

  public updateProject(id: string, updates: Partial<Project>): Project {
    this.getProjectById(id);
    const updated = this.repo.update(id, updates);
    if (!updated) {
      throw new NotFoundError(`Project with ID ${id} not found.`);
    }
    return updated;
  }

  public deleteProject(id: string): { success: boolean; id: string } {
    this.getProjectById(id);
    const success = this.repo.delete(id);
    return { success, id };
  }
}

export const projectService = new ProjectService();
