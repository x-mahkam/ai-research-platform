import { pluginRegistry } from '../registry/index.js';
import { PluginHealthStatus } from '../sdk/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('PluginHealthMonitor');

export interface IPluginSystemHealthReport {
  timestamp: string;
  totalPlugins: number;
  healthyCount: number;
  unhealthyCount: number;
  plugins: Record<string, PluginHealthStatus>;
}

export class PluginHealthMonitor {
  public async checkPluginHealth(pluginId: string): Promise<PluginHealthStatus> {
    try {
      const entry = pluginRegistry.get(pluginId);
      const health = await entry.plugin.health();
      if (health.status === 'UNHEALTHY') {
        pluginRegistry.setStatus(pluginId, 'ERROR');
      }
      return health;
    } catch (err: any) {
      return {
        status: 'UNHEALTHY',
        uptimeSeconds: 0,
        lastChecked: new Date().toISOString(),
        details: `Failed to retrieve plugin health: ${err.message}`,
      };
    }
  }

  public async checkAllPlugins(): Promise<IPluginSystemHealthReport> {
    const entries = pluginRegistry.listAll();
    const reports: Record<string, PluginHealthStatus> = {};
    let healthyCount = 0;
    let unhealthyCount = 0;

    for (const entry of entries) {
      const status = await this.checkPluginHealth(entry.id);
      reports[entry.id] = status;
      if (status.status === 'HEALTHY') healthyCount++;
      else unhealthyCount++;
    }

    logger.info(`Plugin health check completed: ${healthyCount} healthy, ${unhealthyCount} unhealthy.`);

    return {
      timestamp: new Date().toISOString(),
      totalPlugins: entries.length,
      healthyCount,
      unhealthyCount,
      plugins: reports,
    };
  }
}

export const pluginHealthMonitor = new PluginHealthMonitor();
