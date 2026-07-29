export type WorkspaceStatus = 'INITIALIZING' | 'READY' | 'ACTIVE' | 'LOCKED' | 'ARCHIVED' | 'CORRUPTED' | 'CLEANED' | 'FAILED';

export interface IWorkspacePermissions {
  read: boolean;
  write: boolean;
  execute: boolean;
  ownerId: string;
}

export interface WorkspaceOptions {
  ownerId?: string;
  pluginId?: string;
  simulator?: string;
}

export interface IWorkspaceManifest {
  workspaceId: string;
  experimentId: string;
  runId: string;
  pluginId: string;
  simulator: string;
  createdAt: string;
  updatedAt: string;
  status: WorkspaceStatus;
  executionState: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RECOVERED';
  isLocked: boolean;
  version: number;
  permissions: IWorkspacePermissions;
  sizeBytes: number;
  inputFiles: string[];
  outputFiles: string[];
  reportFiles: string[];
  paths: {
    root: string;
    input: string;
    output: string;
    logs: string;
    temp: string;
    reports: string;
    metadata: string;
  };
}

export interface IWorkspaceStorageMetrics {
  experimentId: string;
  runId: string;
  totalSizeBytes: number;
  inputSizeBytes: number;
  outputSizeBytes: number;
  logsSizeBytes: number;
  tempSizeBytes: number;
  reportsSizeBytes: number;
  fileCount: number;
}
