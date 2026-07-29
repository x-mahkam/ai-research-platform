import fs from 'fs';
import path from 'path';
import { IWorkspaceManifest } from '../types.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('WorkspaceVersioning');

export interface IWorkspaceSnapshot {
  snapshotId: string;
  version: number;
  timestamp: string;
  manifest: IWorkspaceManifest;
  tag?: string;
}

export class WorkspaceVersioning {
  public async createVersionSnapshot(
    manifest: IWorkspaceManifest,
    tag?: string
  ): Promise<IWorkspaceSnapshot> {
    manifest.version += 1;
    manifest.updatedAt = new Date().toISOString();

    const snapshotId = `snap-v${manifest.version}-${Date.now()}`;
    const snapshot: IWorkspaceSnapshot = {
      snapshotId,
      version: manifest.version,
      timestamp: new Date().toISOString(),
      manifest: { ...manifest },
      tag: tag || `Version ${manifest.version} Snapshot`,
    };

    const snapshotPath = path.join(
      manifest.paths.root,
      `snapshot-v${manifest.version}.json`
    );
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

    // Update root workspace.json
    const manifestPath = path.join(manifest.paths.root, 'workspace.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    logger.info(`Created workspace version snapshot v${manifest.version} for run ${manifest.runId}`);
    return snapshot;
  }
}

export const workspaceVersioning = new WorkspaceVersioning();
