import { IPlugin, PluginMetadata } from '../sdk/index.js';
import { LoggerService } from '../../logging/logger.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';

const logger = new LoggerService('PluginRegistry');

export interface IRegisteredPluginEntry {
  id: string;
  plugin: IPlugin;
  metadata: PluginMetadata;
  registeredAt: string;
  status: 'ACTIVE' | 'DISABLED' | 'ERROR';
}

export class PluginRegistry {
  private registry: Map<string, IRegisteredPluginEntry> = new Map();

  public async register(plugin: IPlugin): Promise<IRegisteredPluginEntry> {
    const meta = await plugin.metadata();
    if (this.registry.has(meta.id)) {
      logger.warn(`Overwriting registration for plugin ${meta.id}`);
    }

    const entry: IRegisteredPluginEntry = {
      id: meta.id,
      plugin,
      metadata: meta,
      registeredAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    this.registry.set(meta.id, entry);
    logger.info(`Plugin registered successfully: ${meta.name} (${meta.id}) v${meta.version}`);
    return entry;
  }

  public unregister(id: string): boolean {
    const deleted = this.registry.delete(id);
    if (deleted) {
      logger.info(`Unregistered plugin ${id}`);
    }
    return deleted;
  }

  public get(id: string): IRegisteredPluginEntry {
    const entry = this.registry.get(id);
    if (!entry) {
      throw new NotFoundError(`Plugin with ID "${id}" is not registered.`);
    }
    return entry;
  }

  public getPluginInstance(id: string): IPlugin {
    return this.get(id).plugin;
  }

  public has(id: string): boolean {
    return this.registry.has(id);
  }

  public listAll(): IRegisteredPluginEntry[] {
    return Array.from(this.registry.values());
  }

  public listActive(): IRegisteredPluginEntry[] {
    return Array.from(this.registry.values()).filter((e) => e.status === 'ACTIVE');
  }

  public setStatus(id: string, status: 'ACTIVE' | 'DISABLED' | 'ERROR'): void {
    const entry = this.get(id);
    entry.status = status;
    logger.info(`Updated plugin ${id} status to ${status}`);
  }
}

export const pluginRegistry = new PluginRegistry();
