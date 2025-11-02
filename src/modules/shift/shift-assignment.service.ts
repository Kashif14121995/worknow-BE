import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShiftAssignment, ShiftAssignmentDocument, Shift, ShiftDocument, User } from 'src/schemas';
import { CheckInDto, CheckOutDto } from './dto/check-in-out.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/schemas/notification.schema';

@Injectable()
export class ShiftAssignmentService {
  constructor(
    @InjectModel(ShiftAssignment.name) private shiftAssignmentModel: Model<ShiftAssignmentDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationService: NotificationService,
  ) {}

  // Create assignment when shift is assigned to worker
  async createAssignment(shiftId: string, workerId: string, assignedBy: string): Promise<ShiftAssignment> {
    // Check if assignment already exists
    const existing = await this.shiftAssignmentModel.findOne({
      shiftId: new Types.ObjectId(shiftId),
      workerId: new Types.ObjectId(workerId),
    });

    if (existing) {
      return existing;
    }

    const assignment = await this.shiftAssignmentModel.create({
      shiftId: new Types.ObjectId(shiftId),
      workerId: new Types.ObjectId(workerId),
      assignedBy: new Types.ObjectId(assignedBy),
    });

    return assignment;
  }

  // Check-in for shift
  async checkIn(shiftId: string, workerId: string, dto: CheckInDto): Promise<ShiftAssignment> {
    const assignment = await this.shiftAssignmentModel.findOne({
      shiftId: new Types.ObjectId(shiftId),
      workerId: new Types.ObjectId(workerId),
    });

    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    if (assignment.checkInTime) {
      throw new BadRequestException('Already checked in for this shift');
    }

    const shift = await this.shiftModel.findById(shiftId);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Calculate if late (15 minutes threshold)
    const shiftStartDateTime = new Date(shift.startDate);
    const [hours, minutes] = shift.startTime.split(':').map(Number);
    shiftStartDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const lateThresholdMs = 15 * 60 * 1000; // 15 minutes
    const isLate = now.getTime() > shiftStartDateTime.getTime() + lateThresholdMs;

    // Update assignment with check-in
    assignment.checkInTime = now;
    assignment.isLateCheckIn = isLate;
    if (dto.latitude && dto.longitude) {
      assignment.checkInLatitude = dto.latitude;
      assignment.checkInLongitude = dto.longitude;
    }

    await assignment.save();

    // Update shift status to "in_progress" if first check-in
    const checkedInCount = await this.shiftAssignmentModel.countDocuments({
      shiftId: new Types.ObjectId(shiftId),
      checkInTime: { $exists: true },
    });

    if (checkedInCount === 1) {
      await this.shiftModel.findByIdAndUpdate(shiftId, { status: 'in_progress' });
    }

    // Create notification for provider
    try {
      const worker = await this.userModel.findById(workerId);
      const provider = await this.userModel.findById(shift.createdBy);
      if (worker && provider) {
        await this.notificationService.createNotification({
          userId: provider._id.toString(),
          type: NotificationType.SHIFT_ASSIGNED,
          title: 'Worker Checked In',
          message: `${worker.first_name} ${worker.last_name} has checked in for the shift`,
          shiftId: shiftId,
        });
      }
    } catch (error) {
      console.error('Error sending check-in notification:', error);
    }

    return assignment;
  }

  // Check-out from shift
  async checkOut(shiftId: string, workerId: string, dto: CheckOutDto): Promise<ShiftAssignment> {
    const assignment = await this.shiftAssignmentModel.findOne({
      shiftId: new Types.ObjectId(shiftId),
      workerId: new Types.ObjectId(workerId),
    });

    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    if (!assignment.checkInTime) {
      throw new BadRequestException('Must check in before checking out');
    }

    if (assignment.checkOutTime) {
      throw new BadRequestException('Already checked out for this shift');
    }

    const shift = await this.shiftModel.findById(shiftId);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Calculate hours worked
    const checkOutTime = new Date();
    const hoursWorked = (checkOutTime.getTime() - assignment.checkInTime.getTime()) / (1000 * 60 * 60);

    // Update assignment with check-out
    assignment.checkOutTime = checkOutTime;
    assignment.hoursWorked = Math.round(hoursWorked * 100) / 100; // Round to 2 decimal places
    if (dto.latitude && dto.longitude) {
      assignment.checkOutLatitude = dto.latitude;
      assignment.checkOutLongitude = dto.longitude;
    }

    await assignment.save();

    // Update shift status to "completed" if all workers checked out
    const totalAssignments = await this.shiftAssignmentModel.countDocuments({
      shiftId: new Types.ObjectId(shiftId),
    });

    const checkedOutCount = await this.shiftAssignmentModel.countDocuments({
      shiftId: new Types.ObjectId(shiftId),
      checkOutTime: { $exists: true },
    });

    if (checkedOutCount === totalAssignments) {
      await this.shiftModel.findByIdAndUpdate(shiftId, { status: 'completed' });
    }

    // Create notification for provider
    try {
      const worker = await this.userModel.findById(workerId);
      const provider = await this.userModel.findById(shift.createdBy);
      if (worker && provider) {
        await this.notificationService.createNotification({
          userId: provider._id.toString(),
          type: NotificationType.SHIFT_ASSIGNED,
          title: 'Worker Checked Out',
          message: `${worker.first_name} ${worker.last_name} has checked out from the shift`,
          shiftId: shiftId,
        });
      }
    } catch (error) {
      console.error('Error sending check-out notification:', error);
    }

    return assignment;
  }

  // Get assignment details
  async getAssignment(shiftId: string, workerId: string): Promise<ShiftAssignment> {
    const assignment = await this.shiftAssignmentModel
      .findOne({
        shiftId: new Types.ObjectId(shiftId),
        workerId: new Types.ObjectId(workerId),
      })
      .populate('shiftId')
      .populate('workerId', 'first_name last_name email')
      .lean();

    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    return assignment as ShiftAssignment;
  }

  // Get all assignments for a shift
  async getShiftAssignments(shiftId: string): Promise<ShiftAssignment[]> {
    return this.shiftAssignmentModel
      .find({ shiftId: new Types.ObjectId(shiftId) })
      .populate('workerId', 'first_name last_name email')
      .sort({ createdAt: 1 })
      .lean();
  }

  // Add rating and feedback (by provider)
  async addRating(
    shiftId: string,
    workerId: string,
    providerId: string,
    rating: number,
    feedback?: string,
  ): Promise<ShiftAssignment> {
    const assignment = await this.shiftAssignmentModel.findOne({
      shiftId: new Types.ObjectId(shiftId),
      workerId: new Types.ObjectId(workerId),
    });

    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    const shift = await this.shiftModel.findById(shiftId);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify provider owns this shift
    if (shift.createdBy.toString() !== providerId) {
      throw new ForbiddenException('You can only rate workers for your own shifts');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    assignment.rating = rating;
    if (feedback) {
      assignment.feedback = feedback;
    }

    await assignment.save();

    return assignment;
  }

  // Auto-update missed shifts (called by cron job)
  async updateMissedShifts(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find shifts that were scheduled to start more than 1 hour ago but have no check-ins
    const missedShifts = await this.shiftModel.find({
      status: 'scheduled',
      startDate: { $lt: oneHourAgo },
    }).lean();

    for (const shift of missedShifts) {
      const hasCheckIns = await this.shiftAssignmentModel.countDocuments({
        shiftId: shift._id,
        checkInTime: { $exists: true },
      });

      if (hasCheckIns === 0) {
        // No one checked in, mark as missed
        await this.shiftModel.findByIdAndUpdate(shift._id, { status: 'missed' });
      }
    }
  }
}

