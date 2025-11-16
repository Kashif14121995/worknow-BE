import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift, ShiftDocument, JobApplying, JobPosting, User } from 'src/schemas';
import { CreateShiftDto } from './dto/create-shift.dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto/update-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto/assign-shift.dto';
import { JobApplicationAppliedStatus } from 'src/constants';
import { MailService } from '../mail/mail.service';
import { ShiftAssignmentService } from './shift-assignment.service';

@Injectable()
export class ShiftService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(JobApplying.name) private jobApplyingModel: Model<JobApplying>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly mailService: MailService,
    private readonly shiftAssignmentService: ShiftAssignmentService,
  ) { }

  async create(dto: CreateShiftDto, userId: string) {
    try {
      const { jobId, appId, assigneeId, startDate, endDate, startTime, endTime, location, notes, breakMinutes } = dto;

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
        ...(location && { location }),
        ...(notes && { notes }),
        ...(breakMinutes !== undefined && { breakMinutes }),
      });

      const savedShift = await shift.save();

      // Create shift assignment record
      await this.shiftAssignmentService.createAssignment(
        savedShift._id.toString(),
        assigneeId,
        userId,
      );

      // Send email notification to assigned seeker
      try {
        const assignee = await this.userModel.findById(assigneeId);
        const provider = await this.userModel.findById(userId);
        if (assignee && provider && job) {
          await this.mailService.sendShiftAssignedEmail({
            seekerEmail: assignee.email,
            seekerName: `${assignee.first_name} ${assignee.last_name}`,
            providerName: `${provider.first_name} ${provider.last_name}`,
            jobTitle: job.jobTitle,
            startDate: new Date(startDate).toLocaleDateString(),
            startTime,
            endDate: new Date(endDate).toLocaleDateString(),
            endTime,
            location: job.workLocation || 'N/A',
          });
        }
      } catch (error) {
        console.error('Error sending shift assigned email:', error);
      }

      return savedShift;
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
    const shift = await this.shiftModel.findById(shiftId).populate('jobId').populate('createdBy');
    if (!shift) throw new NotFoundException('Shift not found');

    // Get newly added assignees
    const existingAssigneeIds = shift.assignees.map((id) => id.toString());
    const newAssignees = dto.assigneeIds.filter(id => !existingAssigneeIds.includes(id));

    // Add unique assignees without duplicates
    const updatedAssignees = Array.from(
      new Set([
        ...shift.assignees.map((id) => id.toString()),
        ...dto.assigneeIds,
      ]),
    ).map((id) => new Types.ObjectId(id));

    shift.assignees = updatedAssignees;
    await shift.save();

    // Create assignment records for new assignees
    for (const assigneeId of newAssignees) {
      await this.shiftAssignmentService.createAssignment(
        shiftId,
        assigneeId,
        shift.createdBy.toString(),
      );
    }

    // Send email notifications to newly assigned seekers
    if (newAssignees.length > 0) {
      try {
        const job = shift.jobId as any;
        const provider = shift.createdBy as any;
        
        for (const assigneeId of newAssignees) {
          const assignee = await this.userModel.findById(assigneeId);
          if (assignee && provider && job) {
            await this.mailService.sendShiftAssignedEmail({
              seekerEmail: assignee.email,
              seekerName: `${assignee.first_name} ${assignee.last_name}`,
              providerName: `${provider.first_name} ${provider.last_name}`,
              jobTitle: job.jobTitle || 'N/A',
              startDate: new Date(shift.startDate).toLocaleDateString(),
              startTime: shift.startTime,
              endDate: new Date(shift.endDate).toLocaleDateString(),
              endTime: shift.endTime,
              location: job.workLocation || 'N/A',
            });
          }
        }
      } catch (error) {
        console.error('Error sending shift assigned emails:', error);
      }
    }

    return shift;
  }

  async unassignAssignees(shiftId: string, dto: AssignShiftDto) {
    const shift = await this.shiftModel.findById(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    // Remove given assignee IDs from assignees array
    shift.assignees = shift.assignees.filter(
      (id) => !dto.assigneeIds.includes(id.toString()),
    );
    await shift.save();

    // Delete corresponding ShiftAssignment records to keep data in sync
    await this.shiftAssignmentService.deleteAssignments(shiftId, dto.assigneeIds);

    return shift;
  }

  // Job Seeker Shift Management
  async getSeekerShifts(
    seekerId: string,
    status: 'upcoming' | 'applied' | 'shortlisted' | 'completed',
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const seekerObjectId = new Types.ObjectId(seekerId);
    const today = new Date();

    let shifts: any[] = [];

    if (status === 'upcoming') {
      // Get shifts assigned to seeker that are upcoming
      shifts = await this.shiftModel
        .find({
          assignees: seekerObjectId,
          startDate: { $gte: today },
          status: { $in: ['scheduled', 'in_progress'] },
        })
        .populate({
          path: 'jobId',
          select: 'jobTitle amount workLocation paymentType',
        })
        .populate({
          path: 'createdBy',
          select: 'first_name last_name',
        })
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } else if (status === 'applied') {
      // Get jobs the seeker has applied to but not yet shortlisted/hired
      const applications = await this.jobApplyingModel
        .find({
          appliedBy: seekerObjectId,
          status: JobApplicationAppliedStatus.applied,
        })
        .populate({
          path: 'appliedFor',
          select: 'jobTitle shiftStartsAt shiftEndsAt amount workLocation paymentType',
        })
        .populate({
          path: 'appliedFor',
          populate: {
            path: 'postedBy',
            select: 'first_name last_name',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      shifts = applications.map((app: any) => ({
        _id: app._id,
        jobId: app.appliedFor,
        createdBy: app.appliedFor?.postedBy,
        startDate: app.appliedFor?.shiftStartsAt,
        endDate: app.appliedFor?.shiftEndsAt,
        status: 'applied',
        applicationStatus: app.status,
      }));
    } else if (status === 'shortlisted') {
      // Get jobs where seeker is shortlisted
      const applications = await this.jobApplyingModel
        .find({
          appliedBy: seekerObjectId,
          status: JobApplicationAppliedStatus.shortlisted,
        })
        .populate({
          path: 'appliedFor',
          select: 'jobTitle shiftStartsAt shiftEndsAt amount workLocation paymentType',
        })
        .populate({
          path: 'appliedFor',
          populate: {
            path: 'postedBy',
            select: 'first_name last_name',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      shifts = applications.map((app: any) => ({
        _id: app._id,
        jobId: app.appliedFor,
        createdBy: app.appliedFor?.postedBy,
        startDate: app.appliedFor?.shiftStartsAt,
        endDate: app.appliedFor?.shiftEndsAt,
        status: 'shortlisted',
        applicationStatus: app.status,
      }));
    } else if (status === 'completed') {
      // Get completed shifts (assigned shifts where endDate < today)
      shifts = await this.shiftModel
        .find({
          assignees: seekerObjectId,
          endDate: { $lt: today },
          status: 'completed',
        })
        .populate({
          path: 'jobId',
          select: 'jobTitle amount workLocation paymentType',
        })
        .populate({
          path: 'createdBy',
          select: 'first_name last_name',
        })
        .sort({ endDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    // Format shifts to match Lister shift structure
    const formattedShifts = shifts.map((shift: any) => {
      const job = shift.jobId || shift;
      
      // For applied/shortlisted, we need to construct the jobId object properly
      let jobIdObj: any = {};
      if (job && typeof job === 'object' && job._id) {
        // Job is already populated
        jobIdObj = {
          _id: job._id,
          jobTitle: job.jobTitle || 'N/A',
          jobWorkLocation: job.workLocation || job.jobWorkLocation || 'N/A',
          jobAmount: job.amount || job.jobAmount || 0,
          jobPaymentType: job.paymentType || job.jobPaymentType || 'hour',
        };
      } else if (job && typeof job === 'object') {
        // Job might be a plain object
        jobIdObj = {
          _id: job._id || job.id || '',
          jobTitle: job.jobTitle || 'N/A',
          jobWorkLocation: job.workLocation || job.jobWorkLocation || 'N/A',
          jobAmount: job.amount || job.jobAmount || 0,
          jobPaymentType: job.paymentType || job.jobPaymentType || 'hour',
        };
      }

      // Get dates and times - for applied/shortlisted, use job dates
      // Note: Jobs don't have separate time fields, only dates
      const startDate = shift.startDate || job?.shiftStartsAt || null;
      const endDate = shift.endDate || job?.shiftEndsAt || startDate;
      // For shifts, we have startTime/endTime. For jobs (applied/shortlisted), times are not available
      const startTime = shift.startTime || null;
      const endTime = shift.endTime || null;

      return {
        _id: shift._id?.toString() || shift._id,
        shiftId: shift.shiftId || shift._id?.toString() || shift._id,
        jobId: jobIdObj,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        startTime: startTime || null,
        endTime: endTime || null,
        status: shift.status || (status === 'upcoming' || status === 'completed' ? 'scheduled' : status),
        appliedAt: shift.appliedAt || (status === 'applied' || status === 'shortlisted' ? new Date().toISOString() : undefined),
        assignedAt: shift.assignedAt || (status === 'upcoming' || status === 'completed' ? new Date().toISOString() : undefined),
      };
    });

    const total = await this.getSeekerShiftsCount(seekerId, status);

    return {
      shifts: formattedShifts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getSeekerShiftsCount(
    seekerId: string,
    status: 'upcoming' | 'applied' | 'shortlisted' | 'completed',
  ): Promise<number> {
    const seekerObjectId = new Types.ObjectId(seekerId);
    const today = new Date();

    if (status === 'upcoming') {
      return this.shiftModel.countDocuments({
        assignees: seekerObjectId,
        startDate: { $gte: today },
        status: { $in: ['open', 'filled'] },
      });
    } else if (status === 'applied') {
      return this.jobApplyingModel.countDocuments({
        appliedBy: seekerObjectId,
        status: JobApplicationAppliedStatus.applied,
      });
    } else if (status === 'shortlisted') {
      return this.jobApplyingModel.countDocuments({
        appliedBy: seekerObjectId,
        status: JobApplicationAppliedStatus.shortlisted,
      });
    } else if (status === 'completed') {
      return this.shiftModel.countDocuments({
        assignees: seekerObjectId,
        endDate: { $lt: today },
        status: 'completed',
      });
    }
    return 0;
  }

  // Job Seeker Shift Management Methods
  async getSeekerShiftDetails(shiftId: string, seekerId: string) {
    const seekerObjectId = new Types.ObjectId(seekerId);
    
    // First, try to find as an actual shift
    const shift = await this.shiftModel
      .findOne({
        _id: shiftId,
        assignees: seekerObjectId, // Ensure seeker is assigned to this shift
      })
      .populate({
        path: 'jobId',
        select: 'jobTitle jobId jobType industry description amount workLocation paymentType shiftDuration',
      })
      .populate({
        path: 'createdBy',
        select: 'first_name last_name email phone_number',
      })
      .populate({
        path: 'assignees',
        select: 'first_name last_name email',
      })
      .lean();

    if (shift) {
      return shift;
    }

    // If not found as shift, check if it's an application ID
    // This handles the case when status is "applied" or "shortlisted"
    const application = await this.jobApplyingModel
      .findOne({
        _id: shiftId,
        appliedBy: seekerObjectId, // Ensure seeker is the applicant
      })
      .populate({
        path: 'appliedFor',
        select: 'jobTitle jobId jobType industry description amount workLocation paymentType shiftDuration shiftStartsAt shiftEndsAt',
      })
      .populate({
        path: 'appliedFor',
        populate: {
          path: 'postedBy',
          select: 'first_name last_name email phone_number',
        },
      })
      .lean();

    if (application) {
      // Return in shift-like format for frontend compatibility
      const job = application.appliedFor as any;
      const employer = job?.postedBy || {};
      
      return {
        _id: application._id,
        jobId: {
          _id: job?._id,
          jobTitle: job?.jobTitle,
          jobId: job?.jobId,
          jobType: job?.jobType,
          industry: job?.industry,
          description: job?.description,
          amount: job?.amount,
          workLocation: job?.workLocation,
          paymentType: job?.paymentType,
          shiftDuration: job?.shiftDuration,
        },
        createdBy: employer,
        startDate: job?.shiftStartsAt || null,
        endDate: job?.shiftEndsAt || null,
        startTime: null, // Not available in job posting
        endTime: null, // Not available in job posting
        status: application.status, // 'applied' or 'shortlisted'
        assignees: [],
        location: job?.workLocation || null,
        notes: null,
        breakMinutes: null,
        isApplication: true, // Flag to indicate this is an application, not a shift
        applicationStatus: application.status,
      };
    }

    throw new NotFoundException('Shift or application not found or you are not authorized to view it');
  }

  async cancelSeekerShift(shiftId: string, seekerId: string) {
    const seekerObjectId = new Types.ObjectId(seekerId);
    const shift = await this.shiftModel.findById(shiftId);

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Check if seeker is assigned to this shift
    const isAssigned = shift.assignees.some(
      (id) => id.toString() === seekerId,
    );

    if (!isAssigned) {
      throw new NotFoundException('You are not assigned to this shift');
    }

    // Check if shift has already started
    const today = new Date();
    if (shift.startDate < today) {
      throw new Error('Cannot cancel a shift that has already started');
    }

    // Remove seeker from assignees
    shift.assignees = shift.assignees.filter(
      (id) => id.toString() !== seekerId,
    );

    // If no more assignees, update status to open
    if (shift.assignees.length === 0) {
      shift.status = 'scheduled';
    }

    await shift.save();

    // Delete corresponding ShiftAssignment record to keep data in sync
    await this.shiftAssignmentService.deleteAssignment(shiftId, seekerId);

    return {
      message: 'Shift cancelled successfully',
      shift: await this.shiftModel.findById(shiftId).populate([
        { path: 'jobId', select: 'jobTitle jobId' },
        { path: 'createdBy', select: 'first_name last_name' },
      ]),
    };
  }

  async getShiftEmployerContact(shiftId: string, seekerId: string) {
    const seekerObjectId = new Types.ObjectId(seekerId);
    const shift = await this.shiftModel
      .findOne({
        _id: shiftId,
        assignees: seekerObjectId,
      })
      .populate({
        path: 'createdBy',
        select: 'first_name last_name email phone_number _id',
      })
      .lean();

    if (!shift) {
      throw new NotFoundException('Shift not found or you are not assigned to this shift');
    }

    return {
      employer: shift.createdBy,
      shiftId: shift._id,
      jobId: shift.jobId,
    };
  }
}
