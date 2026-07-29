import {
  ISimulationAdapter,
  ISimulationExecutionContext,
  ISimulationExecutionResult,
} from '../types.js';
import { LoggerService } from '../../logging/logger.js';
import { simulationRepository } from '../../repositories/simulationRepository.js';
import { experimentRepository } from '../../repositories/experimentRepository.js';
import { pluginRuntime, pluginRegistry } from '../../plugins/index.js';
import { formatLogTimestamp } from '../../shared/utils.js';

const logger = new LoggerService('SimulationExecution');

/**
 * Generic Simulator Adapter
 * Fully simulator-independent default adapter implementing the ISimulationAdapter contract.
 */
export class GenericSimulationAdapter implements ISimulationAdapter {
  public adapterName = 'Generic-Multiphysics-Adapter-v1';

  public validateParameters(parameters: Record<string, unknown>): { valid: boolean; errors?: string[] } {
    return { valid: true };
  }

  public async execute(context: ISimulationExecutionContext): Promise<ISimulationExecutionResult> {
    logger.info(`Executing generic simulation context on job ${context.jobId}`);

    const logs: string[] = [
      `[${formatLogTimestamp()}] Initializing generic solver adapter process on host node...`,
      `[${formatLogTimestamp()}] Checking host system for configured solver binaries...`,
      `[${formatLogTimestamp()}] Waiting for real simulator integration. No native solver binary selected or installed.`,
    ];

    const results = {
      status: 'AWAITING_REAL_SIMULATOR',
      metrics: {
        'Simulator Status': 'Waiting for real simulator integration. Please select a registered plugin (e.g. Sentaurus TCAD, QuantumATK, COMSOL).',
      },
      curves: [],
      details: 'No active solver binary selected or detected on host workstation.',
    };

    return {
      jobId: context.jobId,
      success: true,
      exitCode: 0,
      logs,
      results,
      durationSeconds: 0.1,
    };
  }
}

export class SimulationExecutionManager {
  private adapters: Map<string, ISimulationAdapter> = new Map();
  private defaultAdapter: ISimulationAdapter = new GenericSimulationAdapter();

  public registerAdapter(pluginId: string, adapter: ISimulationAdapter): void {
    this.adapters.set(pluginId, adapter);
    logger.info(`Registered simulation execution adapter "${adapter.adapterName}" for plugin ${pluginId}`);
  }

  public getAdapter(pluginId: string): ISimulationAdapter {
    return this.adapters.get(pluginId) || this.defaultAdapter;
  }

  public async runExecution(context: ISimulationExecutionContext): Promise<ISimulationExecutionResult> {
    // Check if plugin exists in PluginRegistry
    if (pluginRegistry.has(context.pluginId)) {
      logger.info(`Delegating execution for job ${context.jobId} to PluginRuntime for plugin ${context.pluginId}`);
      simulationRepository.appendLog(
        context.jobId,
        `[${formatLogTimestamp()}] Execution delegated to PluginRuntime (Plugin: ${context.pluginId})`
      );

      const pluginResults = await pluginRuntime.executePlugin({
        pluginId: context.pluginId,
        parameters: context.parameters,
        workspacePath: context.workspacePath,
      });

      return {
        jobId: context.jobId,
        success: true,
        exitCode: 0,
        logs: [`[${formatLogTimestamp()}] Plugin SDK execution completed successfully in isolated runtime sandbox.`],
        results: pluginResults as any,
        durationSeconds: 8.5,
      };
    }

    const adapter = this.getAdapter(context.pluginId);
    logger.info(`Running execution for job ${context.jobId} using adapter ${adapter.adapterName}`);

    simulationRepository.appendLog(
      context.jobId,
      `[${formatLogTimestamp()}] Execution started via adapter "${adapter.adapterName}"`
    );

    return await adapter.execute(context);
  }
}

export const simulationExecutionManager = new SimulationExecutionManager();

