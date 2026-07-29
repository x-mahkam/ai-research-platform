import { IPlugin } from '../sdk/index.js';
import { pluginRegistry } from '../registry/index.js';
import { pluginValidator } from '../validator/index.js';
import { LoggerService } from '../../logging/logger.js';
import { ValidationError } from '../../shared/errors.js';

const logger = new LoggerService('PluginInstaller');

export interface IInstallOptions {
  autoEnable?: boolean;
  config?: Record<string, unknown>;
}

export class PluginInstaller {
  public async installPlugin(plugin: IPlugin, options?: IInstallOptions): Promise<string> {
    logger.info('Starting plugin installation process...');

    // 1. Validate Plugin Contract
    const validation = await pluginValidator.validatePluginContract(plugin);
    if (!validation.isValid) {
      throw new ValidationError(`Plugin installation aborted. Validation errors: ${validation.errors.join(', ')}`);
    }

    // 2. Initialize Plugin
    await plugin.initialize(options?.config);

    // 3. Register Plugin
    const entry = await pluginRegistry.register(plugin);

    if (options?.autoEnable === false) {
      pluginRegistry.setStatus(entry.id, 'DISABLED');
    }

    logger.info(`Successfully installed and registered plugin ${entry.id}`);
    return entry.id;
  }

  public async uninstallPlugin(pluginId: string): Promise<void> {
    if (!pluginRegistry.has(pluginId)) {
      throw new ValidationError(`Cannot uninstall plugin ${pluginId}: not found.`);
    }

    const plugin = pluginRegistry.getPluginInstance(pluginId);
    try {
      await plugin.terminate();
      await plugin.cleanup();
    } catch (err: any) {
      logger.error(`Error during cleanup while uninstalling plugin ${pluginId}: ${err.message}`);
    }

    pluginRegistry.unregister(pluginId);
    logger.info(`Uninstalled plugin ${pluginId}`);
  }
}

export const pluginInstaller = new PluginInstaller();
