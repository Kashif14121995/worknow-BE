export const USER_NOT_FOUND = 'user data not found';
export const DATA_FETCHED_SUCCESSFULLY = `Successfully fetched data from server`;
export const CREATED_SUCCESS = `Successfully created {{entity}}`;
export const CREATED_ERROR = `Error creating entity {{entity}}`;

export const UPDATE_SUCCESS = `Successfully updated {{entity}}`;
export const UPDATE_ERROR = `Error updated  {{entity}}`;

export enum UserRole {
  job_seeker = 'job_seeker',
  job_provider = 'job_provider',
  admin = 'admin',
}

export enum AvailableJobs {
  site_worker = 'site_worker',
  software_engineer = 'software_engineer',
}

export enum JobStatus {
  active = 'active',
  closed = 'closed',
  ongoing = 'ongoing',
  cancelled = 'cancelled',
  draft = 'draft',
}

export enum PaymentType {
  contractual = 'contractual',
  per_hour = 'per_hour',
  hourly = 'hourly',
  monthly = 'monthly',
}

export enum JobApplicationAppliedStatus {
  applied,
  shortlisted,
  rejected,
  hired,
  completed,
}

// Re-export verification enums for easy access
export { VerificationDocumentType, VerificationStatus } from 'src/schemas/user-verification.schema';

// Re-export blocking enums
export { BlockReason } from 'src/schemas/blocked-user.schema';
