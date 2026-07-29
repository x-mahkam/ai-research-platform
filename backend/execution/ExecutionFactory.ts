import { IExecutionRequest, SupportedSoftware } from './types.js';

export class ExecutionFactory {
  public createSentaurusRequest(
    binaryName: 'sdevice' | 'sde' | 'snmesh' | 'swb',
    cmdFilePath: string,
    workingDirectory: string,
    options?: {
      experimentId?: string;
      runId?: string;
      timeoutMs?: number;
      env?: Record<string, string>;
    }
  ): IExecutionRequest {
    const stroot = process.env.STROOT || '/usr/synopsys/sentaurus';
    const binaryPath = `${stroot}/bin/${binaryName}`;

    return {
      executablePath: binaryPath,
      arguments: [cmdFilePath],
      workingDirectory,
      environmentVariables: {
        STROOT: stroot,
        LM_LICENSE_FILE: process.env.LM_LICENSE_FILE || '27000@licenseserver',
        ...options?.env,
      },
      timeoutMs: options?.timeoutMs || 3600000,
      pluginName: 'sentaurus-tcad',
      experimentId: options?.experimentId,
      runId: options?.runId,
      softwareType: 'Synopsys Sentaurus',
    };
  }

  public createQuantumATKRequest(
    scriptPath: string,
    workingDirectory: string,
    options?: { experimentId?: string; runId?: string; timeoutMs?: number }
  ): IExecutionRequest {
    return {
      executablePath: process.env.ATK_PATH || '/usr/local/quantumatk/bin/atkpython',
      arguments: [scriptPath],
      workingDirectory,
      timeoutMs: options?.timeoutMs || 3600000,
      pluginName: 'quantumatk',
      experimentId: options?.experimentId,
      runId: options?.runId,
      softwareType: 'QuantumATK',
    };
  }

  public createCOMSOLRequest(
    modelPath: string,
    workingDirectory: string,
    options?: { experimentId?: string; runId?: string; timeoutMs?: number }
  ): IExecutionRequest {
    return {
      executablePath: process.env.COMSOL_PATH || '/usr/local/comsol/bin/comsol',
      arguments: ['batch', '-inputfile', modelPath],
      workingDirectory,
      timeoutMs: options?.timeoutMs || 3600000,
      pluginName: 'comsol',
      experimentId: options?.experimentId,
      runId: options?.runId,
      softwareType: 'COMSOL',
    };
  }

  public createGenericRequest(
    executablePath: string,
    args: string[],
    workingDirectory: string,
    softwareType: SupportedSoftware = 'Generic',
    options?: { experimentId?: string; runId?: string; timeoutMs?: number; env?: Record<string, string> }
  ): IExecutionRequest {
    return {
      executablePath,
      arguments: args,
      workingDirectory,
      environmentVariables: options?.env,
      timeoutMs: options?.timeoutMs || 3600000,
      pluginName: softwareType.toLowerCase().replace(/\s+/g, '-'),
      experimentId: options?.experimentId,
      runId: options?.runId,
      softwareType,
    };
  }
}

export const executionFactory = new ExecutionFactory();
