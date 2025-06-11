export enum AvailableJobs {
  site_worker = 'site_worker',
  software_engineer = 'software_engineer',
}

export enum JobStatus {
  active = 'active',
  closed = 'closed',
  ongoing = 'ongoing',
  cancelled = 'cancelled',
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
