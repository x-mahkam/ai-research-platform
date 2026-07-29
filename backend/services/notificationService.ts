import { notificationRepository, INotificationRepository } from '../repositories/notificationRepository.js';
import { NotificationEntity } from '../entities/index.js';
import { NotFoundError } from '../shared/errors.js';
import { generateId } from '../shared/utils.js';

export class NotificationService {
  constructor(private repo: INotificationRepository = notificationRepository) {}

  public getNotifications(): NotificationEntity[] {
    return this.repo.findAll();
  }

  public createNotification(data: { title: string; message: string; type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; userId?: string }): NotificationEntity {
    const notification: NotificationEntity = {
      id: generateId('notif'),
      title: data.title,
      message: data.message,
      type: data.type || 'INFO',
      read: false,
      userId: data.userId,
      timestamp: new Date().toISOString(),
    };
    return this.repo.create(notification);
  }

  public markAsRead(id: string): NotificationEntity {
    const notif = this.repo.markAsRead(id);
    if (!notif) {
      throw new NotFoundError(`Notification with ID ${id} not found.`);
    }
    return notif;
  }
}

export const notificationService = new NotificationService();
