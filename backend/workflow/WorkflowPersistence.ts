import fs from 'fs';
import path from 'path';
import { LoggerService } from '../logging/logger.js';
import { IWorkflowHistoryEntry, IWorkflowSerializedContext } from './types.js';
import { WorkflowContext } from './WorkflowContext.js';

const logger = new LoggerService('WorkflowPersistence');

export interface IWorkflowSavedState {
  context: IWorkflowSerializedContext;
  stateHistory: Array<{ state: string; timestamp: string; reason?: string }>;
  history: IWorkflowHistoryEntry[];
  savedAt: string;
}

export class WorkflowPersistence {
  private storageDir: string;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'workspaces', 'workflows');
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch (err: any) {
      logger.error('Failed to create workflow storage directory', { error: err.message });
    }
  }

  public saveWorkflow(context: WorkflowContext, historyEntries: IWorkflowHistoryEntry[] = []): void {
    this.ensureStorageDir();
    const filePath = path.join(this.storageDir, `${context.workflowId}.json`);

    const data: IWorkflowSavedState = {
      context: context.serialize(),
      stateHistory: context.stateTracker.getHistory() as any,
      history: historyEntries,
      savedAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(`Saved workflow persistence for ${context.workflowId}`);
    } catch (err: any) {
      logger.error(`Failed to save workflow state for ${context.workflowId}`, { error: err.message });
    }
  }

  public loadWorkflow(workflowId: string): { context: WorkflowContext; history: IWorkflowHistoryEntry[] } | null {
    const filePath = path.join(this.storageDir, `${workflowId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data: IWorkflowSavedState = JSON.parse(raw);
      const context = WorkflowContext.deserialize(data.context, data.stateHistory);
      return {
        context,
        history: data.history || [],
      };
    } catch (err: any) {
      logger.error(`Failed to load workflow persistence for ${workflowId}`, { error: err.message });
      return null;
    }
  }

  public listSavedWorkflowIds(): string[] {
    this.ensureStorageDir();
    try {
      return fs
        .readdirSync(this.storageDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  public deleteWorkflow(workflowId: string): void {
    const filePath = path.join(this.storageDir, `${workflowId}.json`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err: any) {
        logger.error(`Failed to delete workflow file for ${workflowId}`, { error: err.message });
      }
    }
  }
}

export const workflowPersistence = new WorkflowPersistence();
