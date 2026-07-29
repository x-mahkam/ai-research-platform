import { experimentRepository, IExperimentRepository } from '../repositories/experimentRepository.js';
import { projectRepository, IProjectRepository } from '../repositories/projectRepository.js';
import { modelService } from './modelService.js';
import { pluginService } from './pluginService.js';
import { Experiment } from '../shared/types.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';
import { generateId, getCurrentTimestamp } from '../shared/utils.js';
import { eventBus, DomainEventType } from '../events/eventEmitter.js';

export class ExperimentService {
  constructor(
    private expRepo: IExperimentRepository = experimentRepository,
    private projRepo: IProjectRepository = projectRepository
  ) {}

  public getExperiments(projectId?: string): Experiment[] {
    return this.expRepo.findAll(projectId);
  }

  public getExperimentById(id: string): Experiment {
    const experiment = this.expRepo.findById(id);
    if (!experiment) {
      throw new NotFoundError(`Experiment with ID ${id} not found.`);
    }
    return experiment;
  }

  public createExperiment(expData: Partial<Experiment>): Experiment {
    const expId = generateId('exp');
    const projectId = expData.projectId || '';

    let modelId = expData.modelId;
    let selectedModel;

    if (modelId) {
      selectedModel = modelService.getModelById(modelId);
    } else if (projectId) {
      const projectModels = modelService.getProjectModels(projectId);
      if (projectModels.length > 0) {
        selectedModel = projectModels[0];
        modelId = selectedModel.id;
      }
    }

    // Validation: A project cannot execute unless a simulator is configured, a model file exists, and the simulator supports that file
    if (!selectedModel) {
      throw new ValidationError(
        'Experiment creation failed: No valid model file exists in this project. Please import or upload a model file first.'
      );
    }

    const simulator = expData.simulator || selectedModel.simulator || 'COMSOL Multiphysics';
    const physicsModule = expData.physicsModule || selectedModel.physicsModule || 'Heat Transfer';
    const workspacePath = `/workspaces/experiments/${expId}/${selectedModel.fileName}`;

    const newExp: Experiment = {
      // Client-supplied fields first; server-owned fields below must win —
      // otherwise a request body carrying e.g. an existing "id" silently
      // overwrites that record.
      ...expData,
      notes: [],
      attachments: [],
      tags: expData.tags || [selectedModel.simulator, selectedModel.physicsModule],
      title: expData.title || `Experiment: ${selectedModel.fileName}`,
      description: expData.description || `Execution run for ${selectedModel.fileName} (${selectedModel.simulator})`,
      pluginId: expData.pluginId || 'plugin-auto',
      modelFileName: selectedModel.fileName,
      simulator,
      physicsModule,
      researchGoal: expData.researchGoal || selectedModel.description || 'Scientific simulation sweep',
      workspacePath,
      parameters: expData.parameters || [
        { key: 'param_bias', name: 'Primary Bias / Stimulus', value: 0.7, unit: 'V', group: 'Boundary Conditions' },
        { key: 'param_temp', name: 'Ambient Temperature', value: 300, unit: 'K', group: 'Thermal' },
      ],
      createdBy: expData.createdBy || 'Dr. Jasur Alimov',
      id: expId,
      projectId,
      modelId,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      status: 'Ready',
      version: 1,
    };

    const created = this.expRepo.create(newExp);

    if (newExp.projectId) {
      this.projRepo.incrementExperimentCount(newExp.projectId);
    }

    eventBus.emitDomainEvent(DomainEventType.EXPERIMENT_CREATED, created);
    return created;
  }

  public cloneExperiment(id: string): Experiment {
    const parentExp = this.getExperimentById(id);

    const clonedExp: Experiment = {
      ...parentExp,
      id: generateId('exp'),
      parentId: parentExp.id,
      title: `${parentExp.title} (Clone v${parentExp.version + 1})`,
      version: parentExp.version + 1,
      status: 'Ready',
      results: undefined,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    const created = this.expRepo.create(clonedExp);

    if (clonedExp.projectId) {
      this.projRepo.incrementExperimentCount(clonedExp.projectId);
    }

    eventBus.emitDomainEvent(DomainEventType.EXPERIMENT_CLONED, created);
    return created;
  }

  public updateExperiment(id: string, updates: Partial<Experiment>): Experiment {
    this.getExperimentById(id);
    const updated = this.expRepo.update(id, updates);
    if (!updated) {
      throw new NotFoundError(`Experiment with ID ${id} not found.`);
    }
    return updated;
  }
}

export const experimentService = new ExperimentService();
