import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserVerification,
  UserVerificationDocument,
  VerificationDocumentType,
  VerificationStatus,
  User,
  UserDocument,
} from 'src/schemas';
import { AwsService } from '../aws/aws.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/schemas/notification.schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(UserVerification.name) private verificationModel: Model<UserVerificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private awsService: AwsService,
    private notificationService: NotificationService,
    private mailService: MailService,
  ) {}

  // Upload verification document
  async uploadDocument(
    userId: string,
    documentType: VerificationDocumentType,
    file: Express.Multer.File,
  ): Promise<UserVerification> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if document of this type already exists and is pending/approved
    const existing = await this.verificationModel.findOne({
      userId: new Types.ObjectId(userId),
      documentType,
      status: { $in: [VerificationStatus.PENDING, VerificationStatus.APPROVED] },
    });

    if (existing && existing.status === VerificationStatus.APPROVED) {
      throw new BadRequestException('Document of this type is already approved');
    }

    // Upload file to S3
    const documentUrl = await this.awsService.uploadFile(
      `verification/${userId}/${Date.now()}-${file.originalname}`,
      file.buffer,
      file.mimetype,
    );

    if (existing) {
      // Update existing document
      existing.documentUrl = documentUrl;
      existing.documentName = file.originalname;
      existing.status = VerificationStatus.PENDING;
      existing.reviewedBy = undefined;
      existing.reviewedAt = undefined;
      existing.rejectionReason = undefined;
      await existing.save();
      return existing;
    }

    // Create new verification document
    const verification = await this.verificationModel.create({
      userId: new Types.ObjectId(userId),
      documentType,
      documentUrl,
      documentName: file.originalname,
      status: VerificationStatus.PENDING,
    });

    // Notify support team (admin)
    await this.notifySupportTeamNewVerification(user, verification);

    return verification;
  }

  // Get user's verification documents
  async getUserVerifications(userId: string): Promise<UserVerification[]> {
    return this.verificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('reviewedBy', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  // Admin: Review verification document
  async reviewVerification(
    verificationId: string,
    adminId: string,
    status: VerificationStatus.APPROVED | VerificationStatus.REJECTED,
    rejectionReason?: string,
    adminNotes?: string,
  ): Promise<UserVerification> {
    const verification = await this.verificationModel.findById(verificationId);
    if (!verification) {
      throw new NotFoundException('Verification document not found');
    }

    if (verification.status === VerificationStatus.APPROVED) {
      throw new BadRequestException('Document is already approved');
    }

    verification.status = status;
    verification.reviewedBy = new Types.ObjectId(adminId);
    verification.reviewedAt = new Date();
    verification.rejectionReason = status === VerificationStatus.REJECTED ? rejectionReason : undefined;
    verification.adminNotes = adminNotes;

    await verification.save();

    // If approved, check if all required documents are approved
    if (status === VerificationStatus.APPROVED) {
      await this.updateUserVerificationStatus(verification.userId.toString());
    }

    // Notify user
    const user = await this.userModel.findById(verification.userId);
    if (user) {
      try {
        await this.notificationService.createNotification({
          userId: user._id.toString(),
          type: status === VerificationStatus.APPROVED
            ? NotificationType.SYSTEM_ANNOUNCEMENT
            : NotificationType.SYSTEM_ANNOUNCEMENT,
          title: status === VerificationStatus.APPROVED
            ? 'Verification Approved'
            : 'Verification Rejected',
          message: status === VerificationStatus.APPROVED
            ? `Your ${verification.documentType} verification has been approved.`
            : `Your ${verification.documentType} verification was rejected. ${rejectionReason || ''}`,
        });
      } catch (error) {
        console.error('Error sending verification notification:', error);
      }
    }

    return verification;
  }

  // Update user's identity verification status
  private async updateUserVerificationStatus(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    // Check if all required documents are approved
    const requiredDocTypes =
      user.role === 'job_seeker'
        ? [VerificationDocumentType.GOVERNMENT_ID]
        : [VerificationDocumentType.GOVERNMENT_ID, VerificationDocumentType.BUSINESS_LICENSE];

    const approvedDocs = await this.verificationModel.find({
      userId: new Types.ObjectId(userId),
      documentType: { $in: requiredDocTypes },
      status: VerificationStatus.APPROVED,
    });

    const hasAllRequired = requiredDocTypes.every((docType) =>
      approvedDocs.some((doc) => doc.documentType === docType),
    );

    if (hasAllRequired) {
      await this.userModel.findByIdAndUpdate(userId, { identityVerified: true });
    }
  }

  // Get pending verifications (for admin)
  async getPendingVerifications(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [verifications, total] = await Promise.all([
      this.verificationModel
        .find({ status: VerificationStatus.PENDING })
        .populate('userId', 'first_name last_name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.verificationModel.countDocuments({ status: VerificationStatus.PENDING }),
    ]);

    return {
      verifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Notify support team about new verification
  private async notifySupportTeamNewVerification(
    user: UserDocument,
    verification: UserVerification,
  ): Promise<void> {
    // Get admin users or support email
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@worknow.com';

    try {
      await this.mailService.sendVerificationSubmissionEmail({
        supportEmail,
        userName: `${user.first_name} ${user.last_name}`,
        userEmail: user.email,
        userRole: user.role,
        documentType: verification.documentType,
        submittedAt: new Date().toLocaleString(),
      });
    } catch (error) {
      console.error('Error sending support notification:', error);
    }

    // Create in-app notification for admins
    try {
      const admins = await this.userModel.find({ role: 'admin' }).lean();
      for (const admin of admins) {
        await this.notificationService.createNotification({
          userId: admin._id.toString(),
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: 'New Verification Submission',
          message: `${user.first_name} ${user.last_name} (${user.role}) submitted a ${verification.documentType} for verification`,
          metadata: {
            userId: user._id.toString(),
            verificationId: (verification as any)._id.toString(),
          },
        });
      }
    } catch (error) {
      console.error('Error creating admin notifications:', error);
    }
  }
}

