import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument, User, UserDocument } from 'src/schemas';
import { AwsService } from '../aws/aws.service';
import { ResumeParserService } from './resume-parser.service';
import { UserRole } from 'src/constants';

@Injectable()
export class ResumeService {
  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private awsService: AwsService,
    private resumeParserService: ResumeParserService,
  ) {}

  /**
   * Upload and parse resume
   */
  async uploadResume(
    userId: string,
    file: Express.Multer.File,
    autoPopulate: boolean = true,
  ): Promise<Resume> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.job_seeker) {
      throw new BadRequestException('Only job seekers can upload resumes');
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and Word documents are allowed');
    }

    // Upload file to S3
    const fileUrl = await this.awsService.uploadFile(
      `resumes/${userId}/${Date.now()}-${file.originalname}`,
      file.buffer,
      file.mimetype,
    );

    // Create resume record
    let resume = await this.resumeModel.create({
      userId: new Types.ObjectId(userId),
      fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      isProcessed: false,
    });

    // Parse resume if PDF
    if (file.mimetype === 'application/pdf') {
      try {
        const parsedData = await this.resumeParserService.parseResumeFromPdf(file.buffer);

        // Update resume with parsed data
        resume.parsedName = parsedData.name;
        resume.parsedEmail = parsedData.email;
        resume.parsedPhone = parsedData.phone;
        resume.parsedSkills = parsedData.skills || [];
        resume.parsedEducation = parsedData.education;
        resume.parsedExperience = parsedData.experience;
        resume.parsedJobHistory = parsedData.jobHistory || [];
        resume.parsedData = parsedData;
        resume.isProcessed = true;

        await resume.save();

        // Auto-populate user profile if requested
        if (autoPopulate) {
          await this.autoPopulateProfile(userId, parsedData);
        }
      } catch (error) {
        resume.parsingError = error.message;
        resume.isProcessed = false;
        await resume.save();
        // Don't throw error, just mark as unprocessed
      }
    } else {
      // For Word documents, we can't parse yet, mark as unprocessed
      resume.parsingError = 'Word document parsing not yet supported';
      await resume.save();
    }

    return resume;
  }

  /**
   * Auto-populate user profile from parsed resume data
   */
  private async autoPopulateProfile(userId: string, parsedData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const updates: any = {};

    // Update skills if not already set or merge with existing
    if (parsedData.skills && parsedData.skills.length > 0) {
      const existingSkills = user.skills || [];
      const newSkills = parsedData.skills.filter(
        (skill: string) => !existingSkills.some((existing) => existing.toLowerCase() === skill.toLowerCase()),
      );
      if (newSkills.length > 0) {
        updates.skills = [...existingSkills, ...newSkills];
      }
    }

    // Update education if not set
    if (parsedData.education && !user.education) {
      updates.education = parsedData.education;
    }

    // Update experience if not set or parsed value is higher
    if (parsedData.experience) {
      if (!user.experience || parsedData.experience > user.experience) {
        updates.experience = parsedData.experience;
      }
    }

    // Update phone if not set
    if (parsedData.phone && !user.phone_number) {
      updates.phone_number = parsedData.phone.replace(/\D/g, ''); // Remove non-digits
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await this.userModel.findByIdAndUpdate(userId, updates);
    }
  }

  /**
   * Get user's resumes
   */
  async getUserResumes(userId: string): Promise<Resume[]> {
    return this.resumeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get resume by ID
   */
  async getResume(resumeId: string, userId: string): Promise<Resume> {
    const resume = await this.resumeModel
      .findOne({
        _id: new Types.ObjectId(resumeId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume as Resume;
  }

  /**
   * Delete resume
   */
  async deleteResume(resumeId: string, userId: string): Promise<void> {
    const resume = await this.resumeModel.findOne({
      _id: new Types.ObjectId(resumeId),
      userId: new Types.ObjectId(userId),
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Optionally delete from S3
    // await this.awsService.deleteFile(resume.fileUrl);

    await this.resumeModel.findByIdAndDelete(resumeId);
  }
}

