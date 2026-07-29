import { persistentDbEngine, PersistentDatabaseEngine } from './engine.js';
import {
  Project,
  Experiment,
  SimulationJob,
  SimulatorPlugin,
  OptimizationJob,
  GeneratedReport,
  ModelFile,
} from '../shared/types.js';

export class PersistentDataStoreAdapter {
  constructor(private engine: PersistentDatabaseEngine = persistentDbEngine) {}

  // Projects
  public getProjects(): Project[] {
    return this.engine.find<Project>('projects');
  }

  public getProjectById(id: string): Project | undefined {
    return this.engine.findById<Project>('projects', id);
  }

  public addProject(project: Project): Project {
    return this.engine.insert<Project>('projects', project);
  }

  public updateProject(id: string, updates: Partial<Project>): Project | undefined {
    return this.engine.update<Project>('projects', id, updates);
  }

  public deleteProject(id: string): boolean {
    return this.engine.delete('projects', id);
  }

  // Experiments
  public getExperiments(projectId?: string): Experiment[] {
    if (projectId) {
      return this.engine.find<Experiment>('experiments', (e) => e.projectId === projectId);
    }
    return this.engine.find<Experiment>('experiments');
  }

  public getExperimentById(id: string): Experiment | undefined {
    return this.engine.findById<Experiment>('experiments', id);
  }

  public addExperiment(experiment: Experiment): Experiment {
    return this.engine.insert<Experiment>('experiments', experiment);
  }

  public updateExperiment(id: string, updates: Partial<Experiment>): Experiment | undefined {
    return this.engine.update<Experiment>('experiments', id, updates);
  }

  // Simulation Jobs
  public getSimulationJobs(): SimulationJob[] {
    return this.engine.find<SimulationJob>('jobs');
  }

  public getSimulationJobById(id: string): SimulationJob | undefined {
    return this.engine.findById<SimulationJob>('jobs', id);
  }

  public addSimulationJob(job: SimulationJob): SimulationJob {
    return this.engine.insert<SimulationJob>('jobs', job);
  }

  public updateSimulationJob(id: string, updates: Partial<SimulationJob>): SimulationJob | undefined {
    return this.engine.update<SimulationJob>('jobs', id, updates);
  }

  // Plugins
  public getPlugins(): SimulatorPlugin[] {
    return this.engine.find<SimulatorPlugin>('plugins');
  }

  public getPluginById(id: string): SimulatorPlugin | undefined {
    return this.engine.findById<SimulatorPlugin>('plugins', id);
  }

  // Optimization Jobs
  public getOptimizationJobs(): OptimizationJob[] {
    return this.engine.find<OptimizationJob>('jobs', (j: any) => j.type === 'OPTIMIZATION' || j.type === 'sweep');
  }

  public addOptimizationJob(job: OptimizationJob): OptimizationJob {
    return this.engine.insert<OptimizationJob>('jobs', job as any) as any;
  }

  public getOptimizationJobById(id: string): OptimizationJob | undefined {
    return this.engine.findById<OptimizationJob>('jobs', id);
  }

  public updateOptimizationJob(id: string, updates: Partial<OptimizationJob>): OptimizationJob | undefined {
    return this.engine.update<OptimizationJob>('jobs', id, updates as any);
  }

  // Reports
  public getReports(): GeneratedReport[] {
    return this.engine.find<GeneratedReport>('reports');
  }

  public addReport(report: GeneratedReport): GeneratedReport {
    return this.engine.insert<GeneratedReport>('reports', report);
  }

  // Model Files
  public getModels(projectId?: string): ModelFile[] {
    if (projectId) {
      return this.engine.find<ModelFile>('models', (m) => m.projectId === projectId);
    }
    return this.engine.find<ModelFile>('models');
  }

  public getModelById(id: string): ModelFile | undefined {
    return this.engine.findById<ModelFile>('models', id);
  }

  public addModel(model: ModelFile): ModelFile {
    return this.engine.insert<ModelFile>('models', model);
  }

  public updateModel(id: string, updates: Partial<ModelFile>): ModelFile | undefined {
    return this.engine.update<ModelFile>('models', id, updates);
  }

  public deleteModel(id: string): boolean {
    return this.engine.delete('models', id);
  }
}

export class InMemoryDataStore extends PersistentDataStoreAdapter {}
export const dbStore = new PersistentDataStoreAdapter();
