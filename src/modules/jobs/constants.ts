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

export enum paymentType {
  contractual = 'contractual',
  per_hour = 'per_hour',
}

export enum JobApplicationAppliedStatus {
  hired,
  applied,
  rejected,
  completed,
}
