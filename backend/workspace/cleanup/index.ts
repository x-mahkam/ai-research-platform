import fs from 'fs';
import path from 'path';
import { IWorkspaceManifest } from '../types.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('WorkspaceCleanup');

export class WorkspaceCleanup {
  public async cleanTempDirectory(manifest: IWorkspaceManifest): Promise<number> {
    const tempDir = manifest.paths.temp;
    if (!fs.existsSync(tempDir)) return 0;

    let removedBytes = 0;
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stat = fs.statSync(filePath);
        removedBytes += stat.size;
        fs.rmSync(filePath, { recursive: true, force: true });
      } catch (err: any) {
        logger.warn(`Failed to clean temp file ${filePath}: ${err.message}`);
      }
    }

    logger.info(`Cleaned ${files.length} temporary files (${removedBytes} bytes) in workspace run ${manifest.runId}`);
    return removedBytes;
  }

  public async cleanupWorkspace(manifest: IWorkspaceManifest, mode: 'temp' | 'all' = 'temp'): Promise<number> {
    if (mode === 'temp') {
      return await this.cleanTempDirectory(manifest);
    }

    // Clean temp + output files if requested
    let bytes = await this.cleanTempDirectory(manifest);
    const outputDir = manifest.paths.output;
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      for (const f of files) {
        const fp = path.join(outputDir, f);
        try {
          const stat = fs.statSync(fp);
          bytes += stat.size;
          fs.rmSync(fp, { recursive: true, force: true });
        } catch {
          // Ignore
        }
      }
    }
    return bytes;
  }

  public async archiveWorkspace(manifest: IWorkspaceManifest, destinationArchive?: string): Promise<string> {
    const archivePath = destinationArchive || path.join(manifest.paths.reports, `archive-${manifest.runId}.json`);
    const archiveData = {
      manifest,
      archivedAt: new Date().toISOString(),
      files: {
        input: fs.existsSync(manifest.paths.input) ? fs.readdirSync(manifest.paths.input) : [],
        output: fs.existsSync(manifest.paths.output) ? fs.readdirSync(manifest.paths.output) : [],
        logs: fs.existsSync(manifest.paths.logs) ? fs.readdirSync(manifest.paths.logs) : [],
      },
    };

    fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2), 'utf-8');
    logger.info(`Archived workspace manifest & snapshot to: ${archivePath}`);
    return archivePath;
  }

  public async purgeWorkspace(manifest: IWorkspaceManifest): Promise<void> {
    const rootDir = manifest.paths.root;
    if (fs.existsSync(rootDir)) {
      fs.rmSync(rootDir, { recursive: true, force: true });
      logger.info(`Purged workspace directory for experiment ${manifest.experimentId}, run ${manifest.runId}`);
    }
  }
}

export const workspaceCleanup = new WorkspaceCleanup();
