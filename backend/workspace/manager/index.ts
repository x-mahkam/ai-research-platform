import fs from 'fs';
import path from 'path';
import {
  IWorkspaceManifest,
  IWorkspaceStorageMetrics,
  WorkspaceOptions,
  WorkspaceStatus,
} from '../types.js';
import { workspaceBuilder } from '../builder/index.js';
import { workspaceCleanup } from '../cleanup/index.js';
import { workspaceRecovery } from '../recovery/index.js';
import { workspaceVersioning } from '../versioning/index.js';
import { LoggerService } from '../../logging/logger.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';

const logger = new LoggerService('WorkspaceManager');

export class WorkspaceManager {
  private activeWorkspaces: Map<string, IWorkspaceManifest> = new Map();
  private baseWorkspacesDir: string;

  constructor(customBaseDir?: string) {
    this.baseWorkspacesDir = customBaseDir || path.join(process.cwd(), 'workspaces');
  }

  private getWorkspaceKey(experimentId: string, runId: string): string {
    return `${experimentId}::${runId}`;
  }

  private getWorkspaceDir(experimentId: string, runId: string): string {
    const structuredPath = path.join(this.baseWorkspacesDir, `experiment-${experimentId}`, `run-${runId}`);
    if (fs.existsSync(structuredPath)) return structuredPath;

    const legacyPath = path.join(this.baseWorkspacesDir, experimentId, runId);
    if (fs.existsSync(legacyPath)) return legacyPath;

    return structuredPath;
  }

  public workspaceExists(experimentId: string, runId: string): boolean {
    const key = this.getWorkspaceKey(experimentId, runId);
    if (this.activeWorkspaces.has(key)) return true;

    const dir = this.getWorkspaceDir(experimentId, runId);
    const rootManifest = path.join(dir, 'workspace.json');
    const metaManifest = path.join(dir, 'metadata', 'workspace.json');

    return fs.existsSync(rootManifest) || fs.existsSync(metaManifest);
  }

  public async createWorkspace(
    experimentId: string,
    runId: string,
    options: WorkspaceOptions = {}
  ): Promise<IWorkspaceManifest> {
    if (!experimentId || !runId) {
      throw new ValidationError('Both experimentId and runId are required to build an isolated workspace.');
    }

    const key = this.getWorkspaceKey(experimentId, runId);
    const manifest = await workspaceBuilder.buildWorkspace(experimentId, runId, options);
    this.activeWorkspaces.set(key, manifest);

    logger.info(`Workspace Manager created workspace key: ${key}`);
    return manifest;
  }

  public openWorkspace(experimentId: string, runId: string): IWorkspaceManifest {
    return this.getWorkspace(experimentId, runId);
  }

  public getWorkspace(experimentId: string, runId: string): IWorkspaceManifest {
    const key = this.getWorkspaceKey(experimentId, runId);
    let manifest = this.activeWorkspaces.get(key);

    if (!manifest) {
      const dir = this.getWorkspaceDir(experimentId, runId);
      const manifestPath = path.join(dir, 'workspace.json');
      const metaManifestPath = path.join(dir, 'metadata', 'workspace.json');

      const targetPath = fs.existsSync(manifestPath)
        ? manifestPath
        : fs.existsSync(metaManifestPath)
        ? metaManifestPath
        : null;

      if (targetPath) {
        const raw = fs.readFileSync(targetPath, 'utf-8');
        manifest = JSON.parse(raw) as IWorkspaceManifest;

        if (manifest.paths) {
          manifest.inputFiles = fs.existsSync(manifest.paths.input) ? fs.readdirSync(manifest.paths.input) : [];
          manifest.outputFiles = fs.existsSync(manifest.paths.output) ? fs.readdirSync(manifest.paths.output) : [];
          manifest.reportFiles = fs.existsSync(manifest.paths.reports) ? fs.readdirSync(manifest.paths.reports) : [];
        }

        this.activeWorkspaces.set(key, manifest);
      } else {
        // Fallback: auto-build workspace structure on demand if manifest does not exist on disk
        const rootPath = path.join(this.baseWorkspacesDir, `experiment-${experimentId}`, `run-${runId}`);
        const inputPath = path.join(rootPath, 'input');
        const outputPath = path.join(rootPath, 'output');
        const logsPath = path.join(rootPath, 'logs');
        const tempPath = path.join(rootPath, 'temp');
        const reportsPath = path.join(rootPath, 'reports');
        const metadataPath = path.join(rootPath, 'metadata');

        for (const dir of [rootPath, inputPath, outputPath, logsPath, tempPath, reportsPath, metadataPath]) {
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        }

        const timestamp = new Date().toISOString();
        manifest = {
          workspaceId: `workspace-${experimentId}-${runId}`,
          experimentId,
          runId,
          pluginId: 'sentaurus-tcad',
          simulator: 'Synopsys Sentaurus',
          createdAt: timestamp,
          updatedAt: timestamp,
          status: 'READY',
          executionState: 'IDLE',
          isLocked: false,
          version: 1,
          permissions: { read: true, write: true, execute: true, ownerId: 'system' },
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

        const json = JSON.stringify(manifest, null, 2);
        fs.writeFileSync(path.join(rootPath, 'workspace.json'), json, 'utf-8');
        fs.writeFileSync(path.join(metadataPath, 'workspace.json'), json, 'utf-8');

        this.activeWorkspaces.set(key, manifest);
        logger.info(`Auto-created fallback workspace on-demand for experiment "${experimentId}", run "${runId}".`);
      }
    }

    return manifest;
  }

  public getWorkspaceInfo(experimentId: string, runId: string): IWorkspaceManifest {
    return this.getWorkspace(experimentId, runId);
  }

  public lockWorkspace(experimentId: string, runId: string): void {
    const manifest = this.getWorkspace(experimentId, runId);
    manifest.isLocked = true;
    manifest.status = 'LOCKED';
    manifest.updatedAt = new Date().toISOString();
    this.saveManifest(manifest);
    logger.info(`Locked workspace: ${experimentId}/${runId}`);
  }

  public unlockWorkspace(experimentId: string, runId: string): void {
    const manifest = this.getWorkspace(experimentId, runId);
    manifest.isLocked = false;
    manifest.status = 'READY';
    manifest.updatedAt = new Date().toISOString();
    this.saveManifest(manifest);
    logger.info(`Unlocked workspace: ${experimentId}/${runId}`);
  }

  public setWorkspaceStatus(experimentId: string, runId: string, status: WorkspaceStatus): void {
    const manifest = this.getWorkspace(experimentId, runId);
    manifest.status = status;
    manifest.updatedAt = new Date().toISOString();
    this.saveManifest(manifest);
  }

  private saveManifest(manifest: IWorkspaceManifest): void {
    const rootManifest = path.join(manifest.paths.root, 'workspace.json');
    const metaManifest = path.join(manifest.paths.metadata || manifest.paths.root, 'workspace.json');

    const json = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(rootManifest, json, 'utf-8');
    if (fs.existsSync(path.dirname(metaManifest))) {
      fs.writeFileSync(metaManifest, json, 'utf-8');
    }
  }

  public writeInputFile(experimentId: string, runId: string, fileName: string, content: string | Buffer): string {
    const manifest = this.getWorkspace(experimentId, runId);
    const targetPath = path.join(manifest.paths.input, fileName);
    fs.writeFileSync(targetPath, content);

    if (!manifest.inputFiles.includes(fileName)) {
      manifest.inputFiles.push(fileName);
      this.saveManifest(manifest);
    }

    logger.info(`Wrote input artifact [${fileName}] to workspace input folder: ${targetPath}`);
    return targetPath;
  }

  public writeOutputFile(experimentId: string, runId: string, fileName: string, content: string | Buffer): string {
    const manifest = this.getWorkspace(experimentId, runId);
    const targetPath = path.join(manifest.paths.output, fileName);
    fs.writeFileSync(targetPath, content);

    if (!manifest.outputFiles.includes(fileName)) {
      manifest.outputFiles.push(fileName);
      this.saveManifest(manifest);
    }

    logger.info(`Wrote output artifact [${fileName}] to workspace output folder: ${targetPath}`);
    return targetPath;
  }

  public appendExecutionLog(experimentId: string, runId: string, logLine: string): void {
    try {
      const manifest = this.getWorkspace(experimentId, runId);
      const logFile = path.join(manifest.paths.logs, 'execution.log');
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${logLine}\n`, 'utf-8');
    } catch {
      // Graceful fallback
    }
  }

  public appendSystemLog(experimentId: string, runId: string, logLine: string): void {
    try {
      const manifest = this.getWorkspace(experimentId, runId);
      const logFile = path.join(manifest.paths.logs, 'system.log');
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${logLine}\n`, 'utf-8');
    } catch {
      // Graceful fallback
    }
  }

  public appendPluginLog(experimentId: string, runId: string, logLine: string): void {
    try {
      const manifest = this.getWorkspace(experimentId, runId);
      const logFile = path.join(manifest.paths.logs, 'plugin.log');
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${logLine}\n`, 'utf-8');
    } catch {
      // Graceful fallback
    }
  }

  public writeReportFile(experimentId: string, runId: string, fileName: string, content: string | Buffer): string {
    const manifest = this.getWorkspace(experimentId, runId);
    const targetPath = path.join(manifest.paths.reports, fileName);
    fs.writeFileSync(targetPath, content);

    if (!manifest.reportFiles.includes(fileName)) {
      manifest.reportFiles.push(fileName);
      this.saveManifest(manifest);
    }

    logger.info(`Wrote report artifact [${fileName}] to workspace reports folder: ${targetPath}`);
    return targetPath;
  }

  public getStorageMetrics(experimentId: string, runId: string): IWorkspaceStorageMetrics {
    const manifest = this.getWorkspace(experimentId, runId);

    const calcDirSize = (dirPath: string): { size: number; count: number } => {
      if (!fs.existsSync(dirPath)) return { size: 0, count: 0 };
      let size = 0;
      let count = 0;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const fp = path.join(dirPath, file);
        const stat = fs.statSync(fp);
        if (stat.isFile()) {
          size += stat.size;
          count++;
        }
      }
      return { size, count };
    };

    const inMetrics = calcDirSize(manifest.paths.input);
    const outMetrics = calcDirSize(manifest.paths.output);
    const logMetrics = calcDirSize(manifest.paths.logs);
    const tempMetrics = calcDirSize(manifest.paths.temp);
    const repMetrics = calcDirSize(manifest.paths.reports);

    const totalSizeBytes = inMetrics.size + outMetrics.size + logMetrics.size + tempMetrics.size + repMetrics.size;
    const fileCount = inMetrics.count + outMetrics.count + logMetrics.count + tempMetrics.count + repMetrics.count;

    manifest.sizeBytes = totalSizeBytes;
    this.saveManifest(manifest);

    return {
      experimentId,
      runId,
      totalSizeBytes,
      inputSizeBytes: inMetrics.size,
      outputSizeBytes: outMetrics.size,
      logsSizeBytes: logMetrics.size,
      tempSizeBytes: tempMetrics.size,
      reportsSizeBytes: repMetrics.size,
      fileCount,
    };
  }

  public async cleanupTemp(experimentId: string, runId: string): Promise<number> {
    return await this.cleanupWorkspace(experimentId, runId, 'temp');
  }

  public async cleanupWorkspace(experimentId: string, runId: string, mode: 'temp' | 'all' = 'temp'): Promise<number> {
    const manifest = this.getWorkspace(experimentId, runId);
    return await workspaceCleanup.cleanupWorkspace(manifest, mode);
  }

  public async snapshotVersion(experimentId: string, runId: string, tag?: string): Promise<unknown> {
    const manifest = this.getWorkspace(experimentId, runId);
    return await workspaceVersioning.createVersionSnapshot(manifest, tag);
  }

  public async archiveWorkspace(experimentId: string, runId: string, destinationZip?: string): Promise<string> {
    const manifest = this.getWorkspace(experimentId, runId);
    manifest.status = 'ARCHIVED';
    this.saveManifest(manifest);
    return await workspaceCleanup.archiveWorkspace(manifest, destinationZip);
  }

  public async deleteWorkspace(experimentId: string, runId: string): Promise<void> {
    const key = this.getWorkspaceKey(experimentId, runId);
    if (this.workspaceExists(experimentId, runId)) {
      const manifest = this.getWorkspace(experimentId, runId);
      await workspaceCleanup.purgeWorkspace(manifest);
      this.activeWorkspaces.delete(key);
    }
  }

  public async recoverWorkspace(experimentId: string, runId: string): Promise<IWorkspaceManifest> {
    const manifest = await workspaceRecovery.recoverWorkspace(experimentId, runId);
    const key = this.getWorkspaceKey(experimentId, runId);
    this.activeWorkspaces.set(key, manifest);
    return manifest;
  }

  public async recoverWorkspaces(): Promise<unknown> {
    return await workspaceRecovery.scanAndRecover();
  }
}

export const workspaceManager = new WorkspaceManager();
