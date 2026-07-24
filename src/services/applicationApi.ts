import { initialApplications } from "../mocks/applications";
import type { ApplicationApi, ApplicationStatus, JobApplication, ParsedJob } from "../types/application";
import { createApplicationKey } from "../utils/applicationKey";

type ApiResponse<T> = { success: boolean; data?: T; duplicate?: boolean; application?: JobApplication; error?: string };
const endpoint = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;
const storageKey = "apply-flow-applications";
const pause = () => new Promise((resolve) => setTimeout(resolve, 280));

function readMock(): JobApplication[] {
  if (typeof window === "undefined") return initialApplications;
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    window.localStorage.setItem(storageKey, JSON.stringify(initialApplications));
    return initialApplications;
  }
  return JSON.parse(saved) as JobApplication[];
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
    if (endpoint) return (await request({ action: "checkDuplicate", ...application })).application ?? null;
    await pause();
    const key = createApplicationKey(application.company, application.country, application.position);
    return readMock().find((item) => createApplicationKey(item.company, item.country, item.position) === key) ?? null;
  },
  async createApplication(application: ParsedJob) {
    if (endpoint) return (await request<JobApplication>({ action: "createApplication", ...application })).application!;
    await pause();
    const created: JobApplication = { ...application, appliedDate: new Date().toISOString().slice(0, 10), status: "Waiting" };
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
};
