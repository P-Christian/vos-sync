import { StudentRosterFilter, VsSchoolStudent } from '../types/student-roster.types';
import { createStudentSchema, bulkStudentSchema, updateRosterAcademicsSchema, CreateStudentInput, BulkStudentInput } from '../types/student-roster.schema';
import * as repo from './student-roster.repo';
import { RosterHttpError, resolveExactSchoolAssignment } from './roster-auth';

export { RosterHttpError, resolveExactSchoolAssignment };

export async function getStudentRoster(filter: StudentRosterFilter) {
  if (!filter.school_id) {
    throw new Error('School ID is required');
  }
  return await repo.fetchStudentsRepo({ ...filter, is_alumni: filter.is_alumni ?? false });
}

export async function addSingleStudent(schoolId: number, createdByUserId: number, input: CreateStudentInput): Promise<VsSchoolStudent> {
  const validated = createStudentSchema.parse(input);
  
  const payload: Partial<VsSchoolStudent> = {
    school_id: schoolId,
    student_number: validated.student_number || null,
    first_name: validated.first_name,
    // Required non-null in Directus (rejects null/omission, accepts ''): a blank optional value must be sent as ''.
    middle_name: (validated.middle_name ?? '').trim(),
    last_name: validated.last_name,
    email: validated.email.toLowerCase(),
    school_course_id: validated.school_course_id || null,
    school_year: validated.school_year,
    gpa: validated.gpa ?? null,
    is_alumni: false,
    employee_education_id: null,
    registered_user_id: null,
    invitation_status: 'Not Sent',
    created_by: createdByUserId,
  };

  return await repo.createStudentRepo(payload);
}

export async function addBulkStudents(schoolId: number, createdByUserId: number, inputList: BulkStudentInput): Promise<VsSchoolStudent[]> {
  const validatedList = bulkStudentSchema.parse(inputList);
  
  const payloadList: Partial<VsSchoolStudent>[] = validatedList.map((item) => ({
    school_id: schoolId,
    student_number: item.student_number || null,
    first_name: item.first_name,
    middle_name: (item.middle_name ?? '').trim(),
    last_name: item.last_name,
    email: item.email.toLowerCase(),
    school_course_id: item.school_course_id || null,
    school_year: item.school_year,
    gpa: item.gpa ?? null,
    is_alumni: false,
    employee_education_id: null,
    registered_user_id: null,
    invitation_status: 'Not Sent',
    created_by: createdByUserId,
  }));

  return await repo.bulkCreateStudentsRepo(payloadList);
}

export async function updateStudentAcademics(
  schoolId: number,
  studentId: number,
  input: unknown,
): Promise<VsSchoolStudent> {
  const parsed = updateRosterAcademicsSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first && first.path.length > 0 ? ` (${String(first.path[0])})` : '';
    throw new RosterHttpError(400, `Invalid roster update${where}: ${first?.message ?? 'rejected'}`);
  }

  const current = await repo.fetchStudentByIdRepo(studentId);
  if (!current || Number(current.school_id) !== Number(schoolId)) {
    throw new RosterHttpError(404, 'Student not found');
  }

  const { expected_updated_at, ...academics } = parsed.data;
  if (expected_updated_at !== undefined && String(current.updated_at ?? '') !== expected_updated_at) {
    throw new RosterHttpError(409, 'Stale roster row: refetch before editing');
  }

  const patch: Partial<VsSchoolStudent> = {};
  if (academics.student_number !== undefined) patch.student_number = academics.student_number;
  if (academics.gpa !== undefined) patch.gpa = academics.gpa;
  if (academics.school_year !== undefined) patch.school_year = academics.school_year;

  return await repo.updateStudentRepo(studentId, patch);
}

export async function removeStudentFromRoster(schoolId: number, studentId: number): Promise<boolean> {
  const current = await repo.fetchStudentByIdRepo(studentId);
  if (!current || Number(current.school_id) !== Number(schoolId)) {
    throw new RosterHttpError(404, 'Student not found');
  }
  if (current.employee_education_id !== null && current.employee_education_id !== undefined) {
    throw new RosterHttpError(409, 'Education-linked roster rows cannot be deleted');
  }
  return await repo.deleteStudentRepo(studentId);
}
