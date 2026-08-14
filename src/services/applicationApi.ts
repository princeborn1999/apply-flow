import { initialApplications } from "../mocks/applications";
import type { ApplicationApi, ApplicationStatus, GmailSyncResult, JobApplication, ParsedJob } from "../types/application";
import { createApplicationKey } from "../utils/applicationKey";

type ApiResponse<T> = { success: boolean; data?: T; duplicate?: boolean; application?: JobApplication; error?: string };
const isDemoMode = import.meta.env.VITE_APPLYFLOW_DEMO === "true";
const endpoint = isDemoMode ? "" :
  process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL ||
  process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxr0M3gTQv9tmVVqX7eki1bRF8weV9XJ_8HP6TUpPLdZRicPFlPKSoebNrOs5MakFFp/exec";
const storageKey = "apply-flow-demo-applications-v2";
const legacySeedKeys = new Set([
  "linear::united states::product designer",
  "hostaway::finland::senior frontend engineer",
  "wise::united kingdom::ux engineer",
  "canva::australia::frontend engineer",
  "notion::united states::product engineer",
  "gitlab::remote::senior product designer",
  "miro::netherlands::design systems lead",
  "vercel::united states::dx engineer",
]);
const pause = () => new Promise((resolve) => setTimeout(resolve, 280));

function trimApplication(application: ParsedJob): ParsedJob {
  return {
    company: application.company.trim(),
    country: application.country.trim(),
    position: application.position.trim(),
  };
}

function readMock(): JobApplication[] {
  if (typeof window === "undefined") return initialApplications;
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    window.localStorage.setItem(storageKey, JSON.stringify(initialApplications));
    return initialApplications;
  }
  const applications = JSON.parse(saved) as JobApplication[];
  const cleaned = applications.filter(
    (item) => !legacySeedKeys.has(createApplicationKey(item.company, item.country, item.position)),
  );
  if (cleaned.length !== applications.length) writeMock(cleaned);
  return cleaned;
}

function writeMock(data: JobApplication[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(data));
}

async function request<T>(body?: object): Promise<ApiResponse<T>> {
  if (!endpoint) throw new Error("API_NOT_CONFIGURED");
  const response = await fetch(endpoint, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error("NETWORK_ERROR");
  const result = (await response.json()) as ApiResponse<T>;
  if (!result.success) throw new Error(result.error || "API_ERROR");
  return result;
}

export const applicationApi: ApplicationApi = {
  async getApplications() {
    if (endpoint) return (await request<JobApplication[]>()).data ?? [];
    await pause();
    return readMock();
  },
  async checkDuplicate(application) {
    const cleaned = trimApplication(application);
    if (endpoint) return (await request({ action: "checkDuplicate", ...cleaned })).application ?? null;
    await pause();
    const key = createApplicationKey(cleaned.company, cleaned.country, cleaned.position);
    return readMock().find((item) => createApplicationKey(item.company, item.country, item.position) === key) ?? null;
  },
  async createApplication(application: ParsedJob) {
    const cleaned = trimApplication(application);
    if (endpoint) return (await request<JobApplication>({ action: "createApplication", ...cleaned })).application!;
    await pause();
    const created: JobApplication = { ...cleaned, appliedDate: new Date().toISOString().slice(0, 10), status: "Waiting" };
    writeMock([created, ...readMock()]);
    return created;
  },
  async updateStatus(application: JobApplication, status: ApplicationStatus) {
    if (endpoint) return (await request<JobApplication>({ action: "updateStatus", ...application, status })).application!;
    await pause();
    const key = createApplicationKey(application.company, application.country, application.position);
    const updated = { ...application, status };
    writeMock(readMock().map((item) => createApplicationKey(item.company, item.country, item.position) === key ? updated : item));
    return updated;
  },
  async deleteApplication(application) {
    if (endpoint) { await request({ action: "deleteApplication", ...application }); return; }
    await pause();
    const key = createApplicationKey(application.company, application.country, application.position);
    writeMock(readMock().filter((item) => createApplicationKey(item.company, item.country, item.position) !== key));
  },
  async syncGmail() {
    if (!endpoint) throw new Error("API_NOT_CONFIGURED");
    const result = await request<GmailSyncResult>({ action: "scanGmail" });
    if (!result.data) throw new Error("EMPTY_GMAIL_SYNC_RESULT");
    return result.data;
  },
};
