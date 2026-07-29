import { pluginRepository, IPluginRepository } from '../repositories/pluginRepository.js';
import {
  pluginRegistry,
  pluginHealthMonitor,
  pluginRuntime,
  IPluginSystemHealthReport,
  PluginHealthStatus,
} from '../plugins/index.js';
import { SimulatorPlugin } from '../shared/types.js';

import { SYSTEM_CONSTANTS } from '../configuration/index.js';

export class PluginService {
  constructor(private repo: IPluginRepository = pluginRepository) {
    pluginRuntime.initializeRuntime().catch(() => {});
  }

  public async getAllPlugins(): Promise<SimulatorPlugin[]> {
    await pluginRuntime.initializeRuntime();
    const registered = pluginRegistry.listAll();

    if (registered.length === 0) {
      return this.repo.findAll();
    }

    return registered.map((e) => ({
      id: e.metadata.id,
      name: e.metadata.name,
      simulatorName: e.metadata.simulatorName || e.metadata.name,
      vendor: e.metadata.author.organization || e.metadata.author.name,
      version: e.metadata.version,
      status: e.status === 'ACTIVE' ? 'Active' : 'Inactive',
      description: e.metadata.description,
      licenseStatus: 'Valid',
      supportedOS: [...SYSTEM_CONSTANTS.SUPPORTED_OS_LIST],
      capabilities: {
        supports2DMesh: true,
        supports3D: true,
        supportsParallel: true,
        supportsOptimization: true,
        supportsPauseResume: true,
        supportedFileTypes: e.metadata.supportedFormats,
      },
      physicsModules: e.metadata.physicsModules || [],
      scientificFields: e.metadata.scientificFields || [],
      executable: e.metadata.executable,
      licenseType: e.metadata.licenseType || e.metadata.license,
    }));
  }

  public async getPluginById(id: string): Promise<SimulatorPlugin | undefined> {
    const plugins = await this.getAllPlugins();
    return plugins.find((p) => p.id === id);
  }

  public async checkHealth(): Promise<IPluginSystemHealthReport> {
    await pluginRuntime.initializeRuntime();
    return await pluginHealthMonitor.checkAllPlugins();
  }

  public async getPluginHealth(id: string): Promise<PluginHealthStatus> {
    await pluginRuntime.initializeRuntime();
    return await pluginHealthMonitor.checkPluginHealth(id);
  }

  public async pausePlugin(id: string): Promise<void> {
    await pluginRuntime.pausePlugin(id);
  }

  public async resumePlugin(id: string): Promise<void> {
    await pluginRuntime.resumePlugin(id);
  }

  public async configurePlugin(id: string, config: { executablePath?: string }): Promise<void> {
    if ((id === 'comsol-multiphysics' || id === 'comsol') && config.executablePath) {
      const { ComsolLocator } = await import('../comsol/index.js');
      ComsolLocator.setManualPath(config.executablePath);
    }
  }
}

export const pluginService = new PluginService();
