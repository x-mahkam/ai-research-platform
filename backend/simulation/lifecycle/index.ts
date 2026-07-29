import { SimulationLifecycleState } from '../types.js';
import { LoggerService } from '../../logging/logger.js';
import { eventBus, DomainEventType } from '../../events/eventEmitter.js';

const logger = new LoggerService('SimulationLifecycle');

const ALLOWED_TRANSITIONS: Record<SimulationLifecycleState, SimulationLifecycleState[]> = {
  CREATED: ['VALIDATED', 'FAILED', 'CANCELLED'],
  VALIDATED: ['QUEUED', 'FAILED', 'CANCELLED'],
  QUEUED: ['ASSIGNED', 'CANCELLED', 'PAUSED', 'FAILED'],
  ASSIGNED: ['EXECUTING', 'FAILED', 'CANCELLED'],
  EXECUTING: ['MONITORING', 'PAUSED', 'FAILED', 'CANCELLED'],
  MONITORING: ['COLLECTING', 'PAUSED', 'FAILED', 'CANCELLED'],
  COLLECTING: ['METADATA_STORED', 'FAILED'],
  METADATA_STORED: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: ['CREATED'], // allow retry
  CANCELLED: ['CREATED'], // allow retry
  PAUSED: ['EXECUTING', 'CANCELLED'],
};

export interface ILifecycleStateChange {
  jobId: string;
  previousState?: SimulationLifecycleState;
  currentState: SimulationLifecycleState;
  timestamp: string;
  reason?: string;
}

export class SimulationLifecycleManager {
  private jobStates: Map<string, SimulationLifecycleState> = new Map();
  private stateHistories: Map<string, ILifecycleStateChange[]> = new Map();

  public initializeJobState(jobId: string): SimulationLifecycleState {
    const initialState: SimulationLifecycleState = 'CREATED';
    this.jobStates.set(jobId, initialState);
    const change: ILifecycleStateChange = {
      jobId,
      currentState: initialState,
      timestamp: new Date().toISOString(),
      reason: 'Job initialized',
    };
    this.stateHistories.set(jobId, [change]);
    logger.info(`Job ${jobId} initialized state: ${initialState}`);
    return initialState;
  }

  public transitionTo(
    jobId: string,
    targetState: SimulationLifecycleState,
    reason?: string
  ): SimulationLifecycleState {
    const currentState = this.jobStates.get(jobId);
    if (!currentState) {
      this.initializeJobState(jobId);
      return this.transitionTo(jobId, targetState, reason);
    }

    const allowed = ALLOWED_TRANSITIONS[currentState];
    if (!allowed || !allowed.includes(targetState)) {
      logger.warn(
        `Invalid lifecycle transition for job ${jobId}: ${currentState} -> ${targetState}`
      );
    }

    this.jobStates.set(jobId, targetState);
    const change: ILifecycleStateChange = {
      jobId,
      previousState: currentState,
      currentState: targetState,
      timestamp: new Date().toISOString(),
      reason,
    };

    const history = this.stateHistories.get(jobId) || [];
    history.push(change);
    this.stateHistories.set(jobId, history);

    logger.info(`Lifecycle Transition [${jobId}]: ${currentState} -> ${targetState} (${reason || 'State Progress'})`);

    eventBus.emitDomainEvent(DomainEventType.SIMULATION_STATUS_CHANGED, {
      id: jobId,
      status: targetState,
      previousState: currentState,
      reason,
    });

    return targetState;
  }

  public getState(jobId: string): SimulationLifecycleState | undefined {
    return this.jobStates.get(jobId);
  }

  public getStateHistory(jobId: string): ILifecycleStateChange[] {
    return this.stateHistories.get(jobId) || [];
  }
}

export const simulationLifecycleManager = new SimulationLifecycleManager();
