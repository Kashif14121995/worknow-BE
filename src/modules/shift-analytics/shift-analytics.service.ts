import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Shift,
  ShiftDocument,
  ShiftAssignment,
  ShiftAssignmentDocument,
  User,
  UserDocument,
  JobPosting,
} from 'src/schemas';
import { UserRole } from 'src/constants';
import * as csv from 'csv-writer';

@Injectable()
export class ShiftAnalyticsService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(ShiftAssignment.name) private shiftAssignmentModel: Model<ShiftAssignmentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
  ) {}

  /**
   * Get shift analytics for provider
   */
  async getProviderShiftAnalytics(
    providerId: string,
    startDate?: Date,
    endDate?: Date,
    workerId?: string,
    jobId?: string,
  ) {
    // Verify user is provider
    const provider = await this.userModel.findById(providerId);
    if (!provider || provider.role !== UserRole.job_provider) {
      throw new ForbiddenException('Only providers can view shift analytics');
    }

    // Build query
    const query: any = {
      createdBy: new Types.ObjectId(providerId),
    };

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = startDate;
      if (endDate) query.startDate.$lte = endDate;
    }

    if (jobId) {
      query.jobId = new Types.ObjectId(jobId);
    }

    // Get shifts
    const shifts = await this.shiftModel.find(query).populate('jobId').lean();

    // Get assignments for these shifts
    const shiftIds = shifts.map((s) => s._id);
    const assignmentsQuery: any = {
      shiftId: { $in: shiftIds },
    };

    if (workerId) {
      assignmentsQuery.workerId = new Types.ObjectId(workerId);
    }

    const assignments = await this.shiftAssignmentModel
      .find(assignmentsQuery)
      .populate('workerId', 'first_name last_name email')
      .lean();

    // Calculate analytics
    const totalShifts = shifts.length;
    const completedShifts = shifts.filter((s) => s.status === 'completed').length;
    const missedShifts = shifts.filter((s) => s.status === 'missed').length;
    const cancelledShifts = shifts.filter((s) => s.status === 'cancelled').length;
    const inProgressShifts = shifts.filter((s) => s.status === 'in_progress').length;

    // Calculate hours
    let totalScheduledHours = 0;
    let totalWorkedHours = 0;

    for (const shift of shifts) {
      const shiftStart = new Date(shift.startDate);
      const [startHours, startMinutes] = (shift as any).startTime?.split(':').map(Number) || [0, 0];
      shiftStart.setHours(startHours, startMinutes, 0, 0);

      const shiftEnd = new Date(shift.endDate);
      const [endHours, endMinutes] = (shift as any).endTime?.split(':').map(Number) || [0, 0];
      shiftEnd.setHours(endHours, endMinutes, 0, 0);

      const scheduledHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
      totalScheduledHours += scheduledHours;
    }

    for (const assignment of assignments) {
      if (assignment.hoursWorked) {
        totalWorkedHours += assignment.hoursWorked;
      }
    }

    // Calculate late arrivals
    const lateCheckIns = assignments.filter((a) => a.isLateCheckIn === true).length;

    // Calculate attendance rate
    const totalAssignments = assignments.length;
    const checkedInAssignments = assignments.filter((a) => a.checkInTime).length;
    const attendanceRate =
      totalAssignments > 0 ? (checkedInAssignments / totalAssignments) * 100 : 0;

    // Get worker statistics
    const workerStats = this.calculateWorkerStats(assignments);

    return {
      summary: {
        totalShifts,
        completedShifts,
        missedShifts,
        cancelledShifts,
        inProgressShifts,
        totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
        totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
        lateCheckIns,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
      workerStats,
      shifts: shifts.slice(0, 50), // Limit for response size
      assignments: assignments.slice(0, 100),
    };
  }

  /**
   * Calculate worker statistics
   */
  private calculateWorkerStats(assignments: any[]): Array<{
    workerId: string;
    workerName: string;
    totalShifts: number;
    completedShifts: number;
    missedShifts: number;
    totalHoursWorked: number;
    averageRating?: number;
    lateCheckIns: number;
  }> {
    const workerMap = new Map<string, any>();

    for (const assignment of assignments) {
      const workerId = assignment.workerId?._id?.toString() || assignment.workerId?.toString();
      if (!workerId) continue;

      if (!workerMap.has(workerId)) {
        workerMap.set(workerId, {
          workerId,
          workerName: assignment.workerId
            ? `${(assignment.workerId as any).first_name || ''} ${(assignment.workerId as any).last_name || ''}`.trim()
            : 'Unknown',
          totalShifts: 0,
          completedShifts: 0,
          missedShifts: 0,
          totalHoursWorked: 0,
          ratings: [],
          lateCheckIns: 0,
        });
      }

      const stats = workerMap.get(workerId);
      stats.totalShifts++;
      if (assignment.checkOutTime) stats.completedShifts++;
      if (assignment.hoursWorked) stats.totalHoursWorked += assignment.hoursWorked;
      if (assignment.rating) stats.ratings.push(assignment.rating);
      if (assignment.isLateCheckIn) stats.lateCheckIns++;
    }

    // Convert map to array and calculate averages
    return Array.from(workerMap.values()).map((stats) => ({
      workerId: stats.workerId,
      workerName: stats.workerName,
      totalShifts: stats.totalShifts,
      completedShifts: stats.completedShifts,
      missedShifts: stats.missedShifts,
      totalHoursWorked: Math.round(stats.totalHoursWorked * 100) / 100,
      averageRating:
        stats.ratings.length > 0
          ? Math.round((stats.ratings.reduce((a: number, b: number) => a + b, 0) / stats.ratings.length) * 100) / 100
          : undefined,
      lateCheckIns: stats.lateCheckIns,
    }));
  }

  /**
   * Export shift analytics as CSV
   */
  async exportShiftAnalyticsToCSV(
    providerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Buffer> {
    const analytics = await this.getProviderShiftAnalytics(providerId, startDate, endDate);

    const csvWriter = (csv as any).createObjectCsvStringifier({
      header: [
        { id: 'shiftId', title: 'Shift ID' },
        { id: 'jobTitle', title: 'Job Title' },
        { id: 'workerName', title: 'Worker Name' },
        { id: 'startDate', title: 'Start Date' },
        { id: 'endDate', title: 'End Date' },
        { id: 'startTime', title: 'Start Time' },
        { id: 'endTime', title: 'End Time' },
        { id: 'status', title: 'Status' },
        { id: 'checkInTime', title: 'Check-In Time' },
        { id: 'checkOutTime', title: 'Check-Out Time' },
        { id: 'hoursWorked', title: 'Hours Worked' },
        { id: 'isLate', title: 'Late Check-In' },
        { id: 'rating', title: 'Rating' },
        { id: 'feedback', title: 'Feedback' },
      ],
    });

    // Prepare data
    const records: any[] = [];
    for (const assignment of analytics.assignments) {
      const shift = analytics.shifts.find(
        (s) => s._id.toString() === (assignment as any).shiftId?.toString(),
      );
      const job = shift ? (shift as any).jobId : null;

      records.push({
        shiftId: shift ? (shift as any).shiftId || 'N/A' : 'N/A',
        jobTitle: job ? job.jobTitle || 'N/A' : 'N/A',
        workerName: (assignment as any).workerId
          ? `${((assignment as any).workerId as any).first_name || ''} ${((assignment as any).workerId as any).last_name || ''}`.trim()
          : 'N/A',
        startDate: shift ? new Date(shift.startDate).toLocaleDateString() : 'N/A',
        endDate: shift ? new Date(shift.endDate).toLocaleDateString() : 'N/A',
        startTime: shift ? (shift as any).startTime || 'N/A' : 'N/A',
        endTime: shift ? (shift as any).endTime || 'N/A' : 'N/A',
        status: shift ? shift.status : 'N/A',
        checkInTime: assignment.checkInTime
          ? new Date(assignment.checkInTime).toLocaleString()
          : 'N/A',
        checkOutTime: assignment.checkOutTime
          ? new Date(assignment.checkOutTime).toLocaleString()
          : 'N/A',
        hoursWorked: assignment.hoursWorked || 'N/A',
        isLate: assignment.isLateCheckIn ? 'Yes' : 'No',
        rating: assignment.rating || 'N/A',
        feedback: assignment.feedback || 'N/A',
      });
    }

    const csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);
    return Buffer.from(csvString, 'utf-8');
  }
}

