import { IPlugin, PluginMetadata } from '../sdk/index.js';
import { pluginRegistry } from '../registry/index.js';
import { pluginSandbox } from '../sandbox/index.js';
import { pluginLoader } from '../loader/index.js';
import { pluginInstaller } from '../installer/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('PluginRuntime');

export interface IRuntimeExecutionContext {
  pluginId: string;
  parameters: Record<string, unknown>;
  workspacePath?: string;
  timeoutMs?: number;
}

export class PluginRuntime {
  private isInitialized: boolean = false;

  public async initializeRuntime(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('Initializing Plugin Runtime environment...');
    const builtIns = await pluginLoader.loadBuiltInPlugins();
    for (const plugin of builtIns) {
      await pluginInstaller.installPlugin(plugin, { autoEnable: true });
    }

    this.isInitialized = true;
    logger.info('Plugin Runtime environment initialized successfully.');
  }

  public async executePlugin(context: IRuntimeExecutionContext): Promise<Record<string, unknown>> {
    await this.initializeRuntime();

    const { pluginId, parameters, workspacePath, timeoutMs } = context;
    logger.info(`Runtime executing plugin "${pluginId}" without knowing simulator internals...`);

    const entry = pluginRegistry.get(pluginId);
    const plugin = entry.plugin;

    // Execute through sandbox isolation
    return await pluginSandbox.executeInSandbox(
      pluginId,
      async () => {
        // Validation step
        const val = await plugin.validate(parameters);
        if (!val.valid) {
          throw new Error(`Plugin parameter validation failed: ${val.errors?.join(', ')}`);
        }

        // Prepare step
        await plugin.prepare({ parameters, workspacePath });

        // Execute step
        const result = await plugin.execute({ parameters, workspacePath });

        // Collect Results step
        const finalResults = await plugin.collectResults();

        // Cleanup step
        await plugin.cleanup();

        return Object.keys(finalResults).length > 0 ? finalResults : result;
      },
      { timeoutMs }
    );
  }

  public async pausePlugin(pluginId: string): Promise<void> {
    const plugin = pluginRegistry.getPluginInstance(pluginId);
    await plugin.pause();
  }

  public async resumePlugin(pluginId: string): Promise<void> {
    const plugin = pluginRegistry.getPluginInstance(pluginId);
    await plugin.resume();
  }

  public async terminatePlugin(pluginId: string): Promise<void> {
    const plugin = pluginRegistry.getPluginInstance(pluginId);
    await plugin.terminate();
  }
}

export const pluginRuntime = new PluginRuntime();
