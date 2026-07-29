import fs from 'fs';
import path from 'path';
import { IWorkspaceManifest, IWorkspacePermissions, WorkspaceOptions } from '../types.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('WorkspaceBuilder');

export class WorkspaceBuilder {
  private baseWorkspacesDir: string;

  constructor(customBaseDir?: string) {
    this.baseWorkspacesDir = customBaseDir || path.join(process.cwd(), 'workspaces');
  }

  public async buildWorkspace(
    experimentId: string,
    runId: string,
    options: WorkspaceOptions = {}
  ): Promise<IWorkspaceManifest> {
    const ownerId = options.ownerId || 'system';
    const pluginId = options.pluginId || 'sentaurus-tcad';
    const simulator = options.simulator || 'Synopsys Sentaurus';

    const rootPath = path.join(this.baseWorkspacesDir, `experiment-${experimentId}`, `run-${runId}`);
    const inputPath = path.join(rootPath, 'input');
    const outputPath = path.join(rootPath, 'output');
    const logsPath = path.join(rootPath, 'logs');
    const tempPath = path.join(rootPath, 'temp');
    const reportsPath = path.join(rootPath, 'reports');
    const metadataPath = path.join(rootPath, 'metadata');

    const subdirs = [rootPath, inputPath, outputPath, logsPath, tempPath, reportsPath, metadataPath];

    for (const dir of subdirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Automatically create mandatory log files
    const executionLog = path.join(logsPath, 'execution.log');
    const systemLog = path.join(logsPath, 'system.log');
    const pluginLog = path.join(logsPath, 'plugin.log');

    const timestamp = new Date().toISOString();
    if (!fs.existsSync(executionLog)) fs.writeFileSync(executionLog, `[${timestamp}] Execution log initialized\n`, 'utf-8');
    if (!fs.existsSync(systemLog)) fs.writeFileSync(systemLog, `[${timestamp}] System log initialized\n`, 'utf-8');
    if (!fs.existsSync(pluginLog)) fs.writeFileSync(pluginLog, `[${timestamp}] Plugin log initialized\n`, 'utf-8');

    const permissions: IWorkspacePermissions = {
      read: true,
      write: true,
      execute: true,
      ownerId,
    };

    const manifest: IWorkspaceManifest = {
      workspaceId: `workspace-${experimentId}-${runId}`,
      experimentId,
      runId,
      pluginId,
      simulator,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'READY',
      executionState: 'IDLE',
      isLocked: false,
      version: 1,
      permissions,
      sizeBytes: 0,
      inputFiles: [],
      outputFiles: [],
      reportFiles: [],
      paths: {
        root: rootPath,
        input: inputPath,
        output: outputPath,
        logs: logsPath,
        temp: tempPath,
        reports: reportsPath,
        metadata: metadataPath,
      },
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(path.join(rootPath, 'workspace.json'), manifestJson, 'utf-8');
    fs.writeFileSync(path.join(metadataPath, 'workspace.json'), manifestJson, 'utf-8');

    logger.info(`Built isolated workspace directory structure for experiment ${experimentId}, run ${runId}`);
    return manifest;
  }
}

export const workspaceBuilder = new WorkspaceBuilder();
