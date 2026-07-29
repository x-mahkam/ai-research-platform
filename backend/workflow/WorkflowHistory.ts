import { IWorkflowHistoryEntry } from './types.js';

export class WorkflowHistory {
  private historyMap: Map<string, IWorkflowHistoryEntry[]> = new Map();

  public addEntry(workflowId: string, entry: IWorkflowHistoryEntry): void {
    const list = this.historyMap.get(workflowId) || [];
    list.push(entry);
    this.historyMap.set(workflowId, list);
  }

  public getHistory(workflowId: string): IWorkflowHistoryEntry[] {
    return [...(this.historyMap.get(workflowId) || [])];
  }

  public setHistory(workflowId: string, entries: IWorkflowHistoryEntry[]): void {
    this.historyMap.set(workflowId, [...entries]);
  }

  public clearHistory(workflowId: string): void {
    this.historyMap.delete(workflowId);
  }

  public getLatestEntry(workflowId: string): IWorkflowHistoryEntry | undefined {
    const list = this.historyMap.get(workflowId);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1];
  }
}

export const workflowHistory = new WorkflowHistory();
