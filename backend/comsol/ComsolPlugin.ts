import fs from 'fs';
import path from 'path';
import { BasePlugin, PluginMetadata, PluginHealthStatus } from '../plugins/sdk/index.js';
import { ComsolLocator } from './ComsolLocator.js';
import { ComsolJob } from './ComsolJob.js';
import { comsolRunner } from './ComsolRunner.js';
import { SimulationResult } from './types.js';
import {
  ComsolNotFoundError,
  ComsolExecutionError,
  ComsolLicenseError,
  WorkspaceError,
  TimeoutError,
} from './errors.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('ComsolPlugin');

export class ComsolPlugin extends BasePlugin {
  private executablePath: string | null = null;

  public async metadata(): Promise<PluginMetadata> {
    return {
      id: 'comsol-multiphysics',
      name: 'COMSOL Multiphysics FEM Engine',
      simulatorName: 'COMSOL Multiphysics',
      version: '6.2',
      description: 'Native finite element analysis solver for coupled thermo-electric-mechanical-fluid multiphysics.',
      author: { name: 'COMSOL AB', organization: 'COMSOL' },
      category: 'Multiphysics',
      supportedFormats: ['.mph', '.nas', '.vtu', '.txt', '.log'],
      capabilities: [
        'Multiphysics Coupling',
        'Thermal Dissipation',
        'Piezoelectric Strain',
        'Electromagnetic Field Analysis',
        'CFD Microfluidics',
      ],
      minSdkVersion: '1.0.0',
      physicsModules: [
        'Heat Transfer',
        'Semiconductor Module',
        'AC/DC',
        'Structural Mechanics',
        'CFD',
        'RF',
        'MEMS',
        'Chemical Reaction Engineering',
        'Microfluidics',
        'Optimization',
      ],
      scientificFields: [
        'Multiphysics',
        'Heat Transfer',
        'Fluid Dynamics',
        'Electromagnetics',
        'Structural Mechanics',
        'Chemistry',
        'Semiconductor',
        'Photonics',
      ],
      executable: 'comsolbatch',
      licenseType: 'FLEXlm / Named User',
    };
  }

  public async initialize(config?: Record<string, unknown>): Promise<void> {
    await super.initialize(config);

    if (config?.manualExecutablePath && typeof config.manualExecutablePath === 'string') {
      ComsolLocator.setManualPath(config.manualExecutablePath);
    }

    try {
      this.executablePath = ComsolLocator.findExecutable();
      if (this.executablePath) {
        logger.info(`COMSOL executable located at: ${this.executablePath}`);
      } else {
        logger.warn('COMSOL executable not found on host during plugin initialization.');
      }
    } catch {
      this.executablePath = null;
    }
  }

  public async prepare(context: Record<string, unknown>): Promise<void> {
    await super.prepare(context);
    const workspacePath = (context.workspacePath as string) || process.cwd();

    const inputDir = path.join(workspacePath, 'input');
    const outputDir = path.join(workspacePath, 'output');
    const logsDir = path.join(workspacePath, 'logs');
    const reportsDir = path.join(workspacePath, 'reports');

    for (const dir of [inputDir, outputDir, logsDir, reportsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Check if an input model exists in the input directory.
    // If not provided, write model parameters to a model.mph file or spec file.
    const inputFiles = fs.readdirSync(inputDir).filter((f) => f.endsWith('.mph'));
    if (inputFiles.length === 0) {
      const defaultModelPath = path.join(inputDir, 'model.mph');
      // If a model path is passed in context parameters, copy or reference it
      const params = (context.parameters as Record<string, unknown>) || {};
      if (params.inputModelPath && typeof params.inputModelPath === 'string' && fs.existsSync(params.inputModelPath)) {
        fs.copyFileSync(params.inputModelPath, defaultModelPath);
      } else {
        // Prepare empty placeholder file or model header if no existing .mph was provided
        const modelHeader = `COMSOL Multiphysics Model File Version 6.2\nCreated by AI Research Platform for real comsolbatch execution.\nJob Parameters: ${JSON.stringify(params)}\n`;
        fs.writeFileSync(defaultModelPath, modelHeader, 'utf-8');
      }
    }
  }

  public async execute(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.isRunning = true;
    const workspacePath = (context.workspacePath as string) || process.cwd();
    const experimentId = (context.experimentId as string) || 'exp-default';
    const runId = (context.runId as string) || (context.jobId as string) || `run-${Date.now()}`;
    const params = (context.parameters as Record<string, unknown>) || {};

    // Determine input model path
    const inputDir = path.join(workspacePath, 'input');
    let inputModelPath = (params.inputModelPath as string) || '';

    if (!inputModelPath || !fs.existsSync(inputModelPath)) {
      const existingMph = fs.readdirSync(inputDir).find((f) => f.endsWith('.mph'));
      if (existingMph) {
        inputModelPath = path.join(inputDir, existingMph);
      } else {
        inputModelPath = path.join(inputDir, 'model.mph');
      }
    }

    const outputModelPath = (params.outputModelPath as string) || path.join(workspacePath, 'output', 'result.mph');

    // Run-time COMSOL Global Parameter overrides, if the caller (e.g. an
    // autonomous sweep) supplied specific operating-point values.
    const overridesRaw = (context.parameterOverrides || params.parameterOverrides) as
      | Record<string, unknown>
      | undefined;
    const parameterOverrides: Record<string, string | number> = {};
    if (overridesRaw && typeof overridesRaw === 'object') {
      for (const [k, v] of Object.entries(overridesRaw)) {
        if (typeof v === 'string' || typeof v === 'number') parameterOverrides[k] = v;
      }
    }

    const job = new ComsolJob({
      jobId: (context.jobId as string) || `comsol-job-${Date.now()}`,
      experimentId,
      runId,
      inputModelPath,
      outputModelPath,
      workspacePath,
      parameters: params,
      parameterOverrides,
      options: {
        timeoutMs: (context.timeoutMs as number) || 3600000,
        env: (context.env as Record<string, string>) || {},
      },
    });

    try {
      const result: SimulationResult = await comsolRunner.executeJob(job);
      this.isRunning = false;
      this.lastResults = result as unknown as Record<string, unknown>;
      return this.lastResults;
    } catch (err) {
      this.isRunning = false;
      if (
        err instanceof ComsolNotFoundError ||
        err instanceof ComsolExecutionError ||
        err instanceof ComsolLicenseError ||
        err instanceof WorkspaceError ||
        err instanceof TimeoutError
      ) {
        throw err;
      }
      throw new ComsolExecutionError(`COMSOL execution failed: ${(err as Error).message}`);
    }
  }

  public async health(): Promise<PluginHealthStatus> {
    const execPath = ComsolLocator.findExecutable();
    return {
      status: execPath ? 'HEALTHY' : 'DEGRADED',
      uptimeSeconds: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      lastChecked: new Date().toISOString(),
      details: execPath
        ? `Native COMSOL binary detected at ${execPath}`
        : 'COMSOL executable (comsolbatch) not found in host PATH or standard install directories',
    };
  }
}
