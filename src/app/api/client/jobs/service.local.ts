// src/app/api/client/jobs/service.local.ts
import fs from "fs";
import path from "path";
import { JobPosting, JobType, ExperienceLevel, JobStatus } from "@/modules/client/jobs/types";

const DATA_FILE = path.join(process.cwd(), "zdata", "jobs.json");

function ensureFileExists() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readData(): JobPosting[] {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as JobPosting[];
  } catch {
    return [];
  }
}

function writeData(data: JobPosting[]) {
  ensureFileExists();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function getJobs(companyId: number, status: string | null): Promise<JobPosting[]> {
  const allJobs = readData();
  let filtered = allJobs.filter((j) => j.company_id === companyId);
  if (status && status !== "ALL") {
    filtered = filtered.filter((j) => j.status === status);
  }
  // Sort descending by created_at
  return filtered.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
}

export async function getJob(id: string): Promise<JobPosting> {
  const allJobs = readData();
  const job = allJobs.find((j) => j.job_id.toString() === id);
  if (!job) {
    throw new Error("Job not found.");
  }
  return job;
}

export async function createJob(jobPayload: Record<string, unknown>): Promise<JobPosting> {
  const allJobs = readData();
  
  // Calculate next ID
  const maxId = allJobs.reduce((max, j) => (j.job_id > max ? j.job_id : max), 0);
  const nextId = maxId + 1;

  const newJob: JobPosting = {
    job_id: nextId,
    company_id: Number(jobPayload.company_id),
    job_title: jobPayload.job_title as string,
    job_description: jobPayload.job_description as string,
    job_requirements: jobPayload.job_requirements as string,
    job_type: jobPayload.job_type as JobType,
    job_location: jobPayload.job_location as string,
    job_department: (jobPayload.job_department as string) || null,
    salary_min: jobPayload.salary_min != null ? Number(jobPayload.salary_min) : null,
    salary_max: jobPayload.salary_max != null ? Number(jobPayload.salary_max) : null,
    salary_negotiable: !!jobPayload.salary_negotiable,
    experience_level: (jobPayload.experience_level as ExperienceLevel) || null,
    status: (jobPayload.status as JobStatus) || "DRAFT",
    created_at: (jobPayload.created_at as string) || new Date().toISOString(),
  };

  allJobs.push(newJob);
  writeData(allJobs);
  return newJob;
}

export async function updateJob(id: string, payload: Record<string, unknown>): Promise<JobPosting> {
  const allJobs = readData();
  const idx = allJobs.findIndex((j) => j.job_id.toString() === id);
  if (idx === -1) {
    throw new Error("Job not found.");
  }

  const existing = allJobs[idx];
  const updatedJob: JobPosting = {
    ...existing,
    ...payload,
    // Cast numeric fields safely if provided
    salary_min: payload.salary_min !== undefined ? (payload.salary_min != null ? Number(payload.salary_min) : null) : existing.salary_min,
    salary_max: payload.salary_max !== undefined ? (payload.salary_max != null ? Number(payload.salary_max) : null) : existing.salary_max,
    updated_at: new Date().toISOString(),
  };

  allJobs[idx] = updatedJob;
  writeData(allJobs);
  return updatedJob;
}

export async function deleteJob(id: string): Promise<void> {
  const allJobs = readData();
  const idx = allJobs.findIndex((j) => j.job_id.toString() === id);
  if (idx === -1) {
    throw new Error("Job not found.");
  }

  allJobs[idx] = {
    ...allJobs[idx],
    status: "CLOSED",
    updated_at: new Date().toISOString(),
  };

  writeData(allJobs);
}
