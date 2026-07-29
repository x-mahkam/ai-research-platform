import { WorkflowState } from './types.js';

export interface IStateTransitionRecord {
  state: WorkflowState;
  timestamp: string;
  reason?: string;
}

export class WorkflowStateTracker {
  private currentState: WorkflowState;
  private stateHistory: IStateTransitionRecord[] = [];

  constructor(initialState: WorkflowState = 'Created') {
    this.currentState = initialState;
    this.recordState(initialState, 'Initial creation');
  }

  public get state(): WorkflowState {
    return this.currentState;
  }

  public transitionTo(newState: WorkflowState, reason?: string): void {
    if (this.currentState === 'Completed' || this.currentState === 'Cancelled') {
      if (newState !== 'Created' && newState !== 'Preparing') {
        // Prevent invalid transitions from terminal states unless explicitly restarted
        return;
      }
    }
    this.currentState = newState;
    this.recordState(newState, reason);
  }

  private recordState(state: WorkflowState, reason?: string): void {
    this.stateHistory.push({
      state,
      timestamp: new Date().toISOString(),
      reason,
    });
  }

  public getHistory(): IStateTransitionRecord[] {
    return [...this.stateHistory];
  }

  public isTerminal(): boolean {
    return this.currentState === 'Completed' || this.currentState === 'Failed' || this.currentState === 'Cancelled';
  }

  public restoreHistory(history: IStateTransitionRecord[]): void {
    this.stateHistory = [...history];
    if (history.length > 0) {
      this.currentState = history[history.length - 1].state;
    }
  }
}
