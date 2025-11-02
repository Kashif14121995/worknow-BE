import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from 'src/schemas/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  // Create a new notification
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    jobId?: string;
    applicationId?: string;
    shiftId?: string;
    transactionId?: string;
    messageId?: string;
    invoiceId?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const notification = await this.notificationModel.create({
      userId: new Types.ObjectId(data.userId),
      type: data.type,
      title: data.title,
      message: data.message,
      read: false,
      ...(data.jobId && { jobId: new Types.ObjectId(data.jobId) }),
      ...(data.applicationId && { applicationId: new Types.ObjectId(data.applicationId) }),
      ...(data.shiftId && { shiftId: new Types.ObjectId(data.shiftId) }),
      ...(data.transactionId && { transactionId: new Types.ObjectId(data.transactionId) }),
      ...(data.messageId && { messageId: new Types.ObjectId(data.messageId) }),
      ...(data.invoiceId && { invoiceId: new Types.ObjectId(data.invoiceId) }),
      ...(data.metadata && { metadata: data.metadata }),
    });

    return notification;
  }

  // Get all notifications for a user
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = { userId: new Types.ObjectId(userId) };
    
    if (unreadOnly) {
      filter.read = false;
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
    ]);

    const unreadCount = await this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      userId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return notification;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { read: true, readAt: new Date() },
    );
  }

  // Delete a notification
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  // Delete all read notifications for a user
  async deleteAllReadNotifications(userId: string): Promise<void> {
    await this.notificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
      read: true,
    });
  }

  // Get unread count for a user
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  }
}

