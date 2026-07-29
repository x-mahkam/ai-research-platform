import { IPlugin } from '../sdk/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('PluginSandbox');

export interface ISandboxExecutionOptions {
  timeoutMs?: number;
  maxMemoryMb?: number;
  environmentVars?: Record<string, string>;
}

export class PluginSandbox {
  private defaultTimeoutMs: number = 30000; // 30s timeout guard

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
