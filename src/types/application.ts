export type ApplicationStatus = "Waiting" | "Action Required" | "Interview" | "Rejected" | "Offer";

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

export interface GmailSyncResult {
  scannedMessages: number;
  matchedApplications: number;
  updatedApplications: number;
  counts: Partial<Record<ApplicationStatus, number>>;
  syncedAt: string;
}

export interface JobFitAnalysis {
  score: number;
  technicalFit: number;
  verdict: "非常推薦" | "值得投遞" | "可以考慮" | "不優先";
  tone: "strong" | "good" | "caution" | "weak";
  strengths: string[];
  gaps: string[];
  language: string;
  workAuthorization: string;
  workMode: string;
  reason: string;
}

export interface ApplicationApi {
  getApplications(): Promise<JobApplication[]>;
  checkDuplicate(application: ParsedJob): Promise<JobApplication | null>;
  createApplication(application: ParsedJob): Promise<JobApplication>;
  updateStatus(application: JobApplication, status: ApplicationStatus): Promise<JobApplication>;
  deleteApplication(application: JobApplication): Promise<void>;
  syncGmail(): Promise<GmailSyncResult>;
}
