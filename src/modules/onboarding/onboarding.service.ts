import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Onboarding,
  OnboardingDocument,
  OnboardingStep,
  User,
  UserDocument,
} from 'src/schemas';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(Onboarding.name) private onboardingModel: Model<OnboardingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Initialize onboarding for new user
   */
  async initializeOnboarding(userId: string): Promise<Onboarding> {
    const existing = await this.onboardingModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (existing) {
      return existing;
    }

    const onboarding = await this.onboardingModel.create({
      userId: new Types.ObjectId(userId),
      currentStep: OnboardingStep.PERSONAL_INFO,
      completedSteps: [],
      progress: 0,
      isCompleted: false,
    });

    return onboarding;
  }

  /**
   * Get user's onboarding status
   */
  async getOnboardingStatus(userId: string): Promise<any> {
    let onboarding = await this.onboardingModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!onboarding) {
      // Initialize if doesn't exist
      const initialized = await this.initializeOnboarding(userId);
      return (initialized as any).toObject ? (initialized as any).toObject() : initialized;
    }

    return onboarding;
  }

  /**
   * Complete an onboarding step
   */
  async completeStep(
    userId: string,
    step: OnboardingStep,
  ): Promise<Onboarding> {
    const onboarding = await this.onboardingModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found. Please initialize first.');
    }

    // Add step to completed if not already
    if (!onboarding.completedSteps.includes(step)) {
      onboarding.completedSteps.push(step);
    }

    // Update progress
    const totalSteps = Object.keys(OnboardingStep).length - 1; // Exclude COMPLETE
    onboarding.progress = Math.round((onboarding.completedSteps.length / totalSteps) * 100);

    // Determine next step
    const stepOrder = [
      OnboardingStep.PERSONAL_INFO,
      OnboardingStep.SKILLS,
      OnboardingStep.EXPERIENCE,
      OnboardingStep.EDUCATION,
      OnboardingStep.LOCATION,
      OnboardingStep.PREFERENCES,
      OnboardingStep.VERIFICATION,
    ];

    const currentIndex = stepOrder.indexOf(onboarding.currentStep);
    if (currentIndex < stepOrder.length - 1) {
      onboarding.currentStep = stepOrder[currentIndex + 1];
    }

    // Check if all steps completed
    if (onboarding.completedSteps.length >= totalSteps) {
      onboarding.currentStep = OnboardingStep.COMPLETE;
      onboarding.isCompleted = true;
      onboarding.completedAt = new Date();
    }

    await onboarding.save();

    return onboarding;
  }

  /**
   * Update current step
   */
  async updateCurrentStep(
    userId: string,
    step: OnboardingStep,
  ): Promise<Onboarding> {
    const onboarding = await this.onboardingModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found');
    }

    onboarding.currentStep = step;
    await onboarding.save();

    return onboarding;
  }

  /**
   * Skip a step (optional)
   */
  async skipStep(
    userId: string,
    step: OnboardingStep,
  ): Promise<Onboarding> {
    return this.completeStep(userId, step);
  }

  /**
   * Reset onboarding (for testing/debugging)
   */
  async resetOnboarding(userId: string): Promise<Onboarding> {
    const onboarding = await this.onboardingModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found');
    }

    onboarding.currentStep = OnboardingStep.PERSONAL_INFO;
    onboarding.completedSteps = [];
    onboarding.progress = 0;
    onboarding.isCompleted = false;
    onboarding.completedAt = undefined;

    await onboarding.save();

    return onboarding;
  }
}

