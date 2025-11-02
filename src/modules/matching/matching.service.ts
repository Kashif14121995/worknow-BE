import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, JobPosting, Resume, ResumeDocument } from 'src/schemas';

export interface MatchScore {
  percentage: number;
  breakdown: {
    skills: number;
    experience: number;
    location: number;
    education: number;
    availability?: number;
  };
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
  ) {}

  /**
   * Calculate match score between a job and a user
   */
  async calculateMatchScore(userId: string, jobId: string, job: JobPosting): Promise<MatchScore> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { percentage: 0, breakdown: { skills: 0, experience: 0, location: 0, education: 0 } };
    }

    const breakdown: MatchScore['breakdown'] = {
      skills: 0,
      experience: 0,
      location: 0,
      education: 0,
    };

    // 1. Skills Matching (40% weight)
    const skillsScore = this.matchSkills(user, job);
    breakdown.skills = skillsScore;

    // 2. Experience Matching (25% weight)
    const experienceScore = this.matchExperience(user, job);
    breakdown.experience = experienceScore;

    // 3. Location Matching (20% weight)
    const locationScore = this.matchLocation(user, job);
    breakdown.location = locationScore;

    // 4. Education Matching (15% weight)
    const educationScore = this.matchEducation(user, job);
    breakdown.education = educationScore;

    // Calculate weighted percentage
    const percentage = Math.round(
      breakdown.skills * 0.4 +
      breakdown.experience * 0.25 +
      breakdown.location * 0.2 +
      breakdown.education * 0.15,
    );

    return { percentage, breakdown };
  }

  /**
   * Match skills (40% weight)
   */
  private matchSkills(user: UserDocument, job: JobPosting): number {
    if (!job.requiredSkills || job.requiredSkills.length === 0) {
      return 100; // No skills required means 100% match
    }

    const userSkills = user.skills || [];
    const jobSkills = job.requiredSkills || [];

    if (userSkills.length === 0) {
      return 0;
    }

    // Normalize skills to lowercase for comparison
    const normalizedUserSkills = userSkills.map((s) => s.toLowerCase());
    const normalizedJobSkills = jobSkills.map((s) => s.toLowerCase());

    // Count matching skills
    let matchedCount = 0;
    for (const jobSkill of normalizedJobSkills) {
      if (normalizedUserSkills.some((userSkill) => userSkill.includes(jobSkill) || jobSkill.includes(userSkill))) {
        matchedCount++;
      }
    }

    // Calculate percentage
    return Math.round((matchedCount / normalizedJobSkills.length) * 100);
  }

  /**
   * Match experience (25% weight)
   */
  private matchExperience(user: UserDocument, job: JobPosting): number {
    if (!job.experienceLevel) {
      return 100; // No experience requirement
    }

    const userExperience = user.experience || 0;
    const requiredExperience = parseInt(job.experienceLevel) || 0;

    if (userExperience >= requiredExperience) {
      return 100; // Meets or exceeds requirement
    }

    // Partial match based on how close they are
    const ratio = userExperience / requiredExperience;
    return Math.max(0, Math.round(ratio * 100));
  }

  /**
   * Match location (20% weight)
   */
  private matchLocation(user: UserDocument, job: JobPosting): number {
    if (!job.workLocation) {
      return 100; // No location requirement
    }

    if (!user.location) {
      return 0; // User hasn't specified location
    }

    const userLocation = user.location.toLowerCase().trim();
    const jobLocation = job.workLocation.toLowerCase().trim();

    // Exact match
    if (userLocation === jobLocation) {
      return 100;
    }

    // Partial match (contains same city or state)
    const userParts = userLocation.split(',').map((p) => p.trim());
    const jobParts = jobLocation.split(',').map((p) => p.trim());

    // Check if any part matches
    for (const userPart of userParts) {
      for (const jobPart of jobParts) {
        if (userPart === jobPart || userPart.includes(jobPart) || jobPart.includes(userPart)) {
          return 70; // Partial match
        }
      }
    }

    return 0; // No match
  }

  /**
   * Match education (15% weight)
   */
  private matchEducation(user: UserDocument, job: JobPosting): number {
    if (!job.education) {
      return 100; // No education requirement
    }

    if (!user.education) {
      return 0; // User hasn't specified education
    }

    const userEducation = user.education.toLowerCase();
    const jobEducation = job.education.toLowerCase();

    // Exact match
    if (userEducation === jobEducation) {
      return 100;
    }

    // Partial match (contains same degree type)
    const educationKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'diploma', 'certificate', 'degree'];
    let userHasKeyword = false;
    let jobHasKeyword = false;

    for (const keyword of educationKeywords) {
      if (userEducation.includes(keyword)) userHasKeyword = true;
      if (jobEducation.includes(keyword)) jobHasKeyword = true;
    }

    if (userHasKeyword && jobHasKeyword) {
      return 50; // Both have education keywords
    }

    return 0;
  }

  /**
   * Get match scores for all jobs for a user
   */
  async getMatchScoresForUser(userId: string, jobs: any[]): Promise<Map<string, MatchScore>> {
    const scores = new Map<string, MatchScore>();

    for (const job of jobs) {
      const jobId = job._id ? job._id.toString() : (job as any).id?.toString() || '';
      const score = await this.calculateMatchScore(userId, jobId, job);
      scores.set(jobId, score);
    }

    return scores;
  }

  /**
   * Get recommended jobs for a user based on match score (top N jobs)
   */
  async getRecommendedJobs(userId: string, limit: number = 10): Promise<Array<any & { matchScore: MatchScore }>> {
    // Get active jobs
    const activeJobs = await this.userModel.db
      .collection('jobpostings')
      .find({ status: 'active' })
      .limit(100) // Limit for performance
      .toArray();

    const jobs = activeJobs as any[];

    // Calculate match scores
    const jobsWithScores = await Promise.all(
      jobs.map(async (job: any) => {
        const matchScore = await this.calculateMatchScore(userId, job._id.toString(), job);
        return { ...job, matchScore };
      }),
    );

    // Sort by match score and return top N
    return jobsWithScores
      .sort((a, b) => b.matchScore.percentage - a.matchScore.percentage)
      .slice(0, limit);
  }
}

