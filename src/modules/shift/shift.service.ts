import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift, ShiftDocument, JobApplying, JobPosting } from 'src/schemas';
import { CreateShiftDto } from './dto/create-shift.dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto/update-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto/assign-shift.dto';

@Injectable()
export class ShiftService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(JobApplying.name) private jobApplyingModel: Model<JobApplying>,
  ) { }

  async create(dto: CreateShiftDto, userId: string) {
    try {
      const { jobId, appId, assigneeId, startDate, endDate, startTime, endTime } = dto;

      const assigneeObjectId = new Types.ObjectId(assigneeId);

      // 1️⃣ Ensure Job exists
      const job = await this.jobPostingModel.findById(jobId);
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      // 2️⃣ Ensure Application exists and belongs to this job
      const application = await this.jobApplyingModel.findOne({
        _id: appId,
        appliedFor: jobId,
      });
      if (!application) {
        throw new Error(`Application with ID ${appId} not found for this job`);
      }

      // 3️⃣ Check if a shift exists with same appId + same date/time
      const existingShift = await this.shiftModel.findOne({
        appId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
      });

      if (existingShift) {
        // ✅ Shift exists, add assignee if not already added
        if (!existingShift.assignees.includes(assigneeObjectId)) {
          existingShift.assignees.push(assigneeObjectId);
          await existingShift.save();
        } else {
          throw new Error(`Assignee is already assigned to this shift`);
        }
        return existingShift;
      }

      // 4️⃣ Otherwise, create a new shift
      const shift = new this.shiftModel({
        jobId: new Types.ObjectId(jobId),
        appId: new Types.ObjectId(appId),
        assignees: [assigneeObjectId],
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        createdBy: new Types.ObjectId(userId),
      });

      return shift.save();
    } catch (error) {
      console.error('❌ Error creating shift:', error);
      throw new Error(error.message || 'Failed to create shift');
    }
  }


  async findAll(query: any) {
    const { status, jobId, startDate, endDate, page = 1, limit = 10 } = query;

    const filter: any = {};
    if (status) filter.status = status;
    if (jobId) filter.jobId = jobId;
    if (startDate && endDate) {
      filter.startTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const shifts = await this.shiftModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('jobId')
      .populate('createdBy')
      .exec();

    const total = await this.shiftModel.countDocuments(filter);

    return { total, page: Number(page), limit: Number(limit), shifts: shifts, totalPages: Math.ceil(total / limit), };
  }

  async findOne(id: string) {
    const shift = await this.shiftModel
      .findById(id)
      .populate('jobId')
      .populate('createdBy');
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async update(id: string, dto: UpdateShiftDto) {
    const shift = await this.shiftModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async remove(id: string) {
    const shift = await this.shiftModel.findByIdAndDelete(id);
    if (!shift) throw new NotFoundException('Shift not found');
    return { message: 'Shift deleted successfully' };
  }

  async assignAssignees(shiftId: string, dto: AssignShiftDto) {
    const shift = await this.shiftModel.findById(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    // Add unique assignees without duplicates
    const updatedAssignees = Array.from(
      new Set([
        ...shift.assignees.map((id) => id.toString()),
        ...dto.assigneeIds,
      ]),
    ).map((id) => new Types.ObjectId(id));

    shift.assignees = updatedAssignees;
    await shift.save();

    return shift;
  }

  async unassignAssignees(shiftId: string, dto: AssignShiftDto) {
    const shift = await this.shiftModel.findById(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    // Remove given assignee IDs
    shift.assignees = shift.assignees.filter(
      (id) => !dto.assigneeIds.includes(id.toString()),
    );
    await shift.save();

    return shift;
  }
}
