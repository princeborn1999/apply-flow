export type ApplicationStatus = "Waiting" | "Interview" | "Rejected" | "Offer";

export interface JobApplication {
  company: string;
  country: string;
  position: string;
  appliedDate: string;
  status: ApplicationStatus;
}

export interface ParsedJob {
  company: string;
  country: string;
  position: string;
}

export interface ApplicationApi {
  getApplications(): Promise<JobApplication[]>;
  checkDuplicate(application: ParsedJob): Promise<JobApplication | null>;
  createApplication(application: ParsedJob): Promise<JobApplication>;
  updateStatus(application: JobApplication, status: ApplicationStatus): Promise<JobApplication>;
  deleteApplication(application: JobApplication): Promise<void>;
}
