import fs from 'fs';
import path from 'path';
import { IWorkspaceManifest } from '../types.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('WorkspaceRecovery');

export interface IRecoveryReport {
  scannedWorkspaces: number;
  recoveredWorkspaces: number;
  corruptedWorkspaces: number;
  details: string[];
}

export class WorkspaceRecovery {
  private baseWorkspacesDir: string;

  constructor(customBaseDir?: string) {
    this.baseWorkspacesDir = customBaseDir || path.join(process.cwd(), 'workspaces');
  }

  public async recoverWorkspace(experimentId: string, runId: string): Promise<IWorkspaceManifest> {
    const rootPath = path.join(this.baseWorkspacesDir, `experiment-${experimentId}`, `run-${runId}`);
    const metadataPath = path.join(rootPath, 'metadata', 'workspace.json');
    const rootManifestPath = path.join(rootPath, 'workspace.json');

    const targetManifest = fs.existsSync(metadataPath) ? metadataPath : rootManifestPath;

    if (!fs.existsSync(targetManifest)) {
      throw new Error(`Cannot recover workspace ${experimentId}/${runId}: workspace.json metadata missing at ${targetManifest}`);
    }

    const raw = fs.readFileSync(targetManifest, 'utf-8');
    const manifest: IWorkspaceManifest = JSON.parse(raw);

    // If interrupted during RUNNING/ACTIVE, set state to RECOVERED and unlock
    if (manifest.status === 'INITIALIZING' || manifest.status === 'ACTIVE' || manifest.isLocked) {
      manifest.status = 'READY';
      manifest.executionState = 'RECOVERED';
      manifest.isLocked = false;
      manifest.updatedAt = new Date().toISOString();

      const updated = JSON.stringify(manifest, null, 2);
      fs.writeFileSync(rootManifestPath, updated, 'utf-8');
      if (fs.existsSync(path.dirname(metadataPath))) {
        fs.writeFileSync(metadataPath, updated, 'utf-8');
      }
      logger.info(`Recovered workspace state for ${experimentId}/${runId}`);
    }

    return manifest;
  }

  public async scanAndRecover(): Promise<IRecoveryReport> {
    const report: IRecoveryReport = {
      scannedWorkspaces: 0,
      recoveredWorkspaces: 0,
      corruptedWorkspaces: 0,
      details: [],
    };

    if (!fs.existsSync(this.baseWorkspacesDir)) {
      return report;
    }

    const expDirs = fs.readdirSync(this.baseWorkspacesDir);

    for (const expDir of expDirs) {
      const expPath = path.join(this.baseWorkspacesDir, expDir);
      if (!fs.statSync(expPath).isDirectory()) continue;

      const runDirs = fs.readdirSync(expPath);
      for (const runDir of runDirs) {
        const runPath = path.join(expPath, runDir);
        if (!fs.statSync(runPath).isDirectory()) continue;

        report.scannedWorkspaces++;

        const expId = expDir.replace(/^experiment-/, '');
        const runId = runDir.replace(/^run-/, '');

        try {
          await this.recoverWorkspace(expId, runId);
          report.recoveredWorkspaces++;
          report.details.push(`Recovered workspace ${expId}/${runId}`);
        } catch (err: any) {
          report.corruptedWorkspaces++;
          report.details.push(`Error recovering ${expId}/${runId}: ${err.message}`);
        }
      }
    }

    logger.info(`Workspace recovery scan completed: Scanned ${report.scannedWorkspaces}, Recovered ${report.recoveredWorkspaces}, Corrupted ${report.corruptedWorkspaces}`);
    return report;
  }
}

export const workspaceRecovery = new WorkspaceRecovery();
