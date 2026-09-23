import "server-only";

import {
  createEmployeeEducation,
  findSchoolById,
  listEmployeeEducationByUser,
  patchEmployeeEducation,
} from "./invitation.repo";
import {
  buildEducationData,
  selectEducationTarget,
  toEducationUserId,
} from "./education.rules";
import type { SchoolStudentRecord } from "./types";

const educationSyncLocks = new Map<string, Promise<void>>();

export interface EducationSyncInput {
  readonly userId: string | number;
  readonly student: SchoolStudentRecord;
}

export async function withEducationSyncLock<T>(
  key: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = educationSyncLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const completion = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = previous.then(() => completion);
  educationSyncLocks.set(key, chain);

  await previous;
  try {
    return await task();
  } finally {
    release();
    if (educationSyncLocks.get(key) === chain) educationSyncLocks.delete(key);
  }
}

export async function syncEducationFromRoster(
  input: EducationSyncInput
): Promise<"updated" | "inserted" | "skipped"> {
  const userId = toEducationUserId(input.userId);
  if (userId === null) return "skipped";

  return withEducationSyncLock(`${userId}:${input.student.school_id}`, async () => {
    const [educationRows, school] = await Promise.all([
      listEmployeeEducationByUser(userId),
      findSchoolById(input.student.school_id),
    ]);
    const target = selectEducationTarget(
      educationRows,
      input.student.school_id,
      school?.school_name
    );
    const data = buildEducationData(input.student);

    if (target) {
      await patchEmployeeEducation(target.employee_education_id, data);
      return "updated";
    }

    await createEmployeeEducation({ user_id: userId, ...data });
    return "inserted";
  });
}

export async function syncEducationFromRosterBestEffort(
  input: EducationSyncInput
): Promise<void> {
  try {
    await syncEducationFromRoster(input);
  } catch (error: unknown) {
    console.error("[student-invitation.education] Education sync failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      studentId: input.student.student_id,
    });
  }
}
