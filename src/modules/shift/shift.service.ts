import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift, ShiftDocument } from './schemas/shift.schema/shift.schema';
import { CreateShiftDto } from './dto/create-shift.dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto/update-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto/assign-shift.dto';

@Injectable()
export class ShiftService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {}

  async create(dto: CreateShiftDto, userId: string) {
    const shift = new this.shiftModel({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
    return shift.save();
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

    return { total, page: Number(page), limit: Number(limit), shifts: shifts };
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
