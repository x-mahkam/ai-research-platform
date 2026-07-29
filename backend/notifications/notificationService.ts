import { eventBus, DomainEventType, DomainEvent } from '../events/eventEmitter.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('Notifications');

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export class NotificationService {
  private notifications: NotificationPayload[] = [];

  constructor() {
    this.registerEventSubscribers();
  }

  private registerEventSubscribers(): void {
    eventBus.onDomainEvent(DomainEventType.SIMULATION_QUEUED, (event: DomainEvent<any>) => {
      this.sendNotification(
        'Simulation Queued',
        `Job ${event.payload?.id || ''} queued for ${event.payload?.experimentTitle || 'Experiment'}.`,
        'info'
      );
    });

    eventBus.onDomainEvent(DomainEventType.SIMULATION_STATUS_CHANGED, (event: DomainEvent<any>) => {
      this.sendNotification(
        'Simulation Status Updated',
        `Job ${event.payload?.id || ''} status changed to ${event.payload?.status || ''}.`,
        'info'
      );
    });

    eventBus.onDomainEvent(DomainEventType.REPORT_GENERATED, (event: DomainEvent<any>) => {
      this.sendNotification(
        'Report Generated',
        `Scientific Report created for ${event.payload?.experimentTitle || 'Experiment'}.`,
        'success'
      );
    });
  }

  public sendNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): NotificationPayload {
    const notification: NotificationPayload = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
    };
    this.notifications.unshift(notification);
    logger.info(`[Notification] ${title}: ${message}`);
    return notification;
  }

  public getNotifications(): NotificationPayload[] {
    return this.notifications;
  }
}

export const notificationService = new NotificationService();
