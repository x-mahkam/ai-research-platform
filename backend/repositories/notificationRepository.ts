import { BaseRepository } from './baseRepository.js';
import { NotificationEntity } from '../entities/index.js';

export interface INotificationRepository {
  findAll(): NotificationEntity[];
  findById(id: string): NotificationEntity | undefined;
  create(notification: NotificationEntity): NotificationEntity;
  markAsRead(id: string): NotificationEntity | undefined;
}

export class NotificationRepository extends BaseRepository<NotificationEntity> implements INotificationRepository {
  constructor() {
    super('notifications');
  }

  public markAsRead(id: string): NotificationEntity | undefined {
    return this.update(id, { read: true });
  }
}

export const notificationRepository = new NotificationRepository();
