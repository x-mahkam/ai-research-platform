import { IPlugin } from '../sdk/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('PluginSandbox');

export interface ISandboxExecutionOptions {
  timeoutMs?: number;
  maxMemoryMb?: number;
  environmentVars?: Record<string, string>;
}

export class PluginSandbox {
  // Real solver runs (COMSOL, TCAD, etc.) routinely take minutes to hours —
  // COMSOL alone needs ~30s+ just to start its engine and check out a license.
  // A short guard here silently kills legitimate simulations. Default to the
  // solver hard-limit (1h); override with PLUGIN_SANDBOX_TIMEOUT_MS if needed.
  private defaultTimeoutMs: number = Number(process.env.PLUGIN_SANDBOX_TIMEOUT_MS) || 3600000; // 1 hour

  public async executeInSandbox<T>(
    pluginId: string,
    operation: () => Promise<T>,
    options?: ISandboxExecutionOptions
  ): Promise<T> {
    const timeout = options?.timeoutMs || this.defaultTimeoutMs;

    logger.info(`Entering sandbox execution context for plugin ${pluginId} (Timeout: ${timeout}ms)`);

    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Plugin ${pluginId} execution timed out after ${timeout}ms in sandbox isolation.`));
      }, timeout);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } finally {
      if (timer) clearTimeout(timer);
      logger.info(`Exited sandbox execution context for plugin ${pluginId}`);
    }
  }
}

export const pluginSandbox = new PluginSandbox();
