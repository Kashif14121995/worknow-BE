import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument, User } from 'src/schemas';
import { CreateMessageDto } from './dto/create-message.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private mailService: MailService,
  ) {}

  async sendMessage(senderId: string, dto: CreateMessageDto) {
    const message = await this.messageModel.create({
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(dto.receiverId),
      message: dto.message,
      jobId: dto.jobId ? new Types.ObjectId(dto.jobId) : undefined,
      applicationId: dto.applicationId ? new Types.ObjectId(dto.applicationId) : undefined,
      read: false,
    });

    const populatedMessage = await message.populate([
      { path: 'senderId', select: 'first_name last_name email' },
      { path: 'receiverId', select: 'first_name last_name email' },
    ]);

    // Send email notification to receiver
    try {
      const sender = populatedMessage.senderId as any;
      const receiver = populatedMessage.receiverId as any;
      if (sender && receiver) {
        await this.mailService.sendNewMessageEmail({
          receiverEmail: receiver.email,
          receiverName: `${receiver.first_name} ${receiver.last_name}`,
          senderName: `${sender.first_name} ${sender.last_name}`,
          messagePreview: dto.message,
        });
      }
    } catch (error) {
      console.error('Error sending new message email:', error);
    }

    return populatedMessage;
  }

  async getConversation(userId1: string, userId2: string, jobId?: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const user1Id = new Types.ObjectId(userId1);
    const user2Id = new Types.ObjectId(userId2);

    const filter: any = {
      $or: [
        { senderId: user1Id, receiverId: user2Id },
        { senderId: user2Id, receiverId: user1Id },
      ],
    };

    if (jobId) {
      filter.jobId = new Types.ObjectId(jobId);
    }

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .populate('senderId', 'first_name last_name email')
        .populate('receiverId', 'first_name last_name email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments(filter),
    ]);

    // Mark messages as read for the receiver
    await this.messageModel.updateMany(
      {
        receiverId: user1Id,
        senderId: user2Id,
        read: false,
      },
      { read: true },
    );

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const userIdObj = new Types.ObjectId(userId);

    // Get distinct conversations (users who have messaged with this user)
    const conversations = await this.messageModel.aggregate([
      {
        $match: {
          $or: [
            { senderId: userIdObj },
            { receiverId: userIdObj },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userIdObj] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', userIdObj] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          userName: { $concat: ['$user.first_name', ' ', '$user.last_name'] },
          userEmail: '$user.email',
          lastMessage: {
            message: '$lastMessage.message',
            createdAt: '$lastMessage.createdAt',
            senderId: '$lastMessage.senderId',
          },
          unreadCount: 1,
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count of unique conversations
    const conversationIds = await this.messageModel.distinct('senderId', {
      receiverId: userIdObj,
    });
    const sentToIds = await this.messageModel.distinct('receiverId', {
      senderId: userIdObj,
    });
    const allIds = [...new Set([...conversationIds.map(id => id.toString()), ...sentToIds.map(id => id.toString())])];
    const total = allIds.length;

    return {
      conversations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

