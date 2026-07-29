import { IPlugin } from '../sdk/index.js';
import {
  SentaurusTCADPlugin,
  QuantumATKPlugin,
  COMSOLMultiphysicsPlugin,
  LumericalPlugin,
  SilvacoAtlasPlugin,
  MatlabPlugin,
  AnsysHFSSPlugin,
  OpenFOAMPlugin,
} from '../builtin/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('PluginLoader');

export class PluginLoader {
  private builtInPlugins: IPlugin[] = [
    new SentaurusTCADPlugin(),
    new QuantumATKPlugin(),
    new COMSOLMultiphysicsPlugin(),
    new LumericalPlugin(),
    new SilvacoAtlasPlugin(),
    new MatlabPlugin(),
    new AnsysHFSSPlugin(),
    new OpenFOAMPlugin(),
  ];

  public async loadBuiltInPlugins(): Promise<IPlugin[]> {
    logger.info(`Loading ${this.builtInPlugins.length} built-in simulation plugins...`);
    return this.builtInPlugins;
  }

  public async loadPluginFromModule(modulePath: string): Promise<IPlugin> {
    logger.info(`Attempting dynamic import of plugin from module: ${modulePath}`);
    try {
      const pluginModule = await import(modulePath);
      const PluginClass = pluginModule.default || pluginModule.Plugin;
      if (!PluginClass) {
        throw new Error(`Module ${modulePath} does not export a default or named "Plugin" class.`);
      }
      const instance = new PluginClass();
      return instance;
    } catch (err: any) {
      logger.error(`Failed to dynamically load plugin module ${modulePath}: ${err.message}`);
      throw err;
    }
  }
}

export const pluginLoader = new PluginLoader();
