import { Project, Experiment, SimulationJob, SimulatorPlugin, OptimizationJob, GeneratedReport, ModelFile } from '../types';

export class ApiClient {
  public async getProjects(): Promise<Project[]> {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  }

  public async getProjectModels(projectId: string): Promise<ModelFile[]> {
    const res = await fetch(`/api/projects/${projectId}/models`);
    if (!res.ok) throw new Error('Failed to fetch project models');
    return res.json();
  }

  public async createProjectModel(projectId: string, modelData: Partial<ModelFile> & { fileName: string }): Promise<ModelFile> {
    const res = await fetch(`/api/projects/${projectId}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelData),
    });
    if (!res.ok) throw new Error('Failed to upload/create model file');
    return res.json();
  }

  public async updateProjectModel(projectId: string, modelId: string, updates: Partial<ModelFile>): Promise<ModelFile> {
    const res = await fetch(`/api/projects/${projectId}/models/${modelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update model file');
    return res.json();
  }

  public async deleteProjectModel(projectId: string, modelId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/projects/${projectId}/models/${modelId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete model file');
    return res.json();
  }

  public async duplicateProjectModel(projectId: string, modelId: string): Promise<ModelFile> {
    const res = await fetch(`/api/projects/${projectId}/models/${modelId}/duplicate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to duplicate model file');
    return res.json();
  }

  public async setDefaultModel(projectId: string, modelId: string): Promise<ModelFile> {
    const res = await fetch(`/api/projects/${projectId}/models/${modelId}/default`, {
      method: 'PUT',
    });
    if (!res.ok) throw new Error('Failed to set default model');
    return res.json();
  }

  public async replaceProjectModel(projectId: string, modelId: string, modelData: Partial<ModelFile> & { fileName: string }): Promise<ModelFile> {
    const res = await fetch(`/api/projects/${projectId}/models/${modelId}/replace`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelData),
    });
    if (!res.ok) throw new Error('Failed to replace model file');
    return res.json();
  }

  public async validateModelFile(modelData: { fileName: string; simulator?: string; physicsModule?: string; fileSize?: number; checksum?: string }): Promise<any> {
    const res = await fetch('/api/models/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelData),
    });
    if (!res.ok) throw new Error('Failed to validate model file');
    return res.json();
  }

  public async detectModelMeta(fileName: string): Promise<{ fileType: string; simulator: string; physicsModule: string; version: string }> {
    const res = await fetch('/api/models/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });
    if (!res.ok) throw new Error('Failed to auto-detect model metadata');
    return res.json();
  }

  public async getExperiments(): Promise<Experiment[]> {
    const res = await fetch('/api/experiments');
    if (!res.ok) throw new Error('Failed to fetch experiments');
    return res.json();
  }

  public async getSimulations(): Promise<SimulationJob[]> {
    const res = await fetch('/api/simulations');
    if (!res.ok) throw new Error('Failed to fetch simulations');
    return res.json();
  }

  public async getPlugins(): Promise<SimulatorPlugin[]> {
    const res = await fetch('/api/plugins');
    if (!res.ok) throw new Error('Failed to fetch plugins');
    return res.json();
  }

  public async getOptimizations(): Promise<OptimizationJob[]> {
    const res = await fetch('/api/optimizations');
    if (!res.ok) throw new Error('Failed to fetch optimizations');
    return res.json();
  }

  public async getReports(): Promise<GeneratedReport[]> {
    const res = await fetch('/api/reports');
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  }

  public async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  }

  public async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  }

  public async deleteProject(id: string): Promise<void> {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
  }

  public async updateExperiment(id: string, updates: Partial<Experiment>): Promise<Experiment> {
    const res = await fetch(`/api/experiments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update experiment');
    return res.json();
  }

  public async getComsolStatus(): Promise<{ configured: boolean; path?: string }> {
    const res = await fetch('/api/settings/comsol');
    if (!res.ok) throw new Error('Failed to load COMSOL status');
    return res.json();
  }

  public async saveComsolPath(path: string): Promise<{ configured: boolean; path?: string }> {
    const res = await fetch('/api/settings/comsol', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to save COMSOL path');
    }
    return res.json();
  }

  public async planExperimentSetup(input: {
    objective: string;
    simulator?: string;
    providers?: string[];
  }): Promise<import('../types').ExperimentSetupProposal> {
    const res = await fetch('/api/ai/plan-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to generate AI experiment setup');
    return res.json();
  }

  public async getAIProviders(): Promise<{
    providers: { id: string; label: string; model: string; configured: boolean }[];
    default?: string;
  }> {
    const res = await fetch('/api/ai/providers');
    if (!res.ok) throw new Error('Failed to load AI providers');
    return res.json();
  }

  public async saveAIKeys(keys: Record<string, string>): Promise<{
    providers: { id: string; label: string; model: string; configured: boolean }[];
    default?: string;
  }> {
    const res = await fetch('/api/ai/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keys),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to save API keys');
    }
    return res.json();
  }

  public async planResearch(goal: string): Promise<{
    planId: string;
    recommendedPlugin: string;
    physicalModels: string[];
    suggestedParameters: Record<string, unknown>;
    voltageSweepConfig: { start: number; stop: number; step: number };
    meshResolution: string;
    rationale: string;
  }> {
    const res = await fetch('/api/ai/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal }),
    });
    if (!res.ok) throw new Error('Failed to analyze research objective');
    // The endpoint wraps the plan: { agent: 'PlannerAgent', plan: {...} }
    const payload = await res.json();
    return payload.plan ?? payload;
  }

  public async getPluginsHealth(): Promise<{
    timestamp: string;
    totalPlugins: number;
    healthyCount: number;
    unhealthyCount: number;
    plugins: Record<
      string,
      { status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'; uptimeSeconds: number; lastChecked: string; details?: string }
    >;
  }> {
    const res = await fetch('/api/plugins/health');
    if (!res.ok) throw new Error('Failed to check plugin health');
    return res.json();
  }

  public async createExperiment(expData: Partial<Experiment>): Promise<Experiment> {
    const res = await fetch('/api/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expData),
    });
    if (!res.ok) throw new Error('Failed to create experiment');
    return res.json();
  }

  public async cloneExperiment(id: string): Promise<Experiment> {
    const res = await fetch(`/api/experiments/${id}/clone`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clone experiment');
    return res.json();
  }

  public async runSimulation(experimentId: string): Promise<SimulationJob> {
    const res = await fetch('/api/simulations/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experimentId }),
    });
    if (!res.ok) throw new Error('Failed to run simulation');
    return res.json();
  }

  public async performJobAction(jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry'): Promise<SimulationJob> {
    const res = await fetch(`/api/simulations/${jobId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error('Failed to perform job action');
    return res.json();
  }

  public async stepOptimization(jobId: string): Promise<OptimizationJob> {
    const res = await fetch(`/api/optimizations/${jobId}/step`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to step optimization');
    return res.json();
  }

  public async generateReport(experiment: Experiment, projectName: string): Promise<GeneratedReport> {
    const res = await fetch('/api/ai/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment, projectName }),
    });
    if (!res.ok) throw new Error('Failed to generate report');
    return res.json();
  }
}

export const apiClient = new ApiClient();
