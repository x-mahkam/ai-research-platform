import { EventEmitter } from 'events';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('Events');

export enum DomainEventType {
  PROJECT_CREATED = 'PROJECT_CREATED',
  EXPERIMENT_CREATED = 'EXPERIMENT_CREATED',
  EXPERIMENT_CLONED = 'EXPERIMENT_CLONED',
  SIMULATION_QUEUED = 'SIMULATION_QUEUED',
  SIMULATION_STATUS_CHANGED = 'SIMULATION_STATUS_CHANGED',
  REPORT_GENERATED = 'REPORT_GENERATED',
}

export interface DomainEvent<T = unknown> {
  type: DomainEventType;
  timestamp: string;
  payload: T;
}

export class ApplicationEventEmitter extends EventEmitter {
  public emitDomainEvent<T>(type: DomainEventType, payload: T): void {
    const event: DomainEvent<T> = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    logger.debug(`Domain Event Emitted: ${type}`, { event });
    this.emit(type, event);
  }

  public onDomainEvent<T>(type: DomainEventType, listener: (event: DomainEvent<T>) => void): void {
    this.on(type, listener as (...args: unknown[]) => void);
  }
}

export const eventBus = new ApplicationEventEmitter();
