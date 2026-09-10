import { StudentRosterFilter, VsSchoolStudent } from '../types/student-roster.types';
import { createStudentSchema, bulkStudentSchema, CreateStudentInput, BulkStudentInput } from '../types/student-roster.schema';
import * as repo from './student-roster.repo';

export async function getStudentRoster(filter: StudentRosterFilter) {
  if (!filter.school_id) {
    throw new Error('School ID is required');
  }
  return await repo.fetchStudentsRepo(filter);
}

export async function addSingleStudent(schoolId: number, createdByUserId: number, input: CreateStudentInput): Promise<VsSchoolStudent> {
  const validated = createStudentSchema.parse(input);
  
  const payload: Partial<VsSchoolStudent> = {
    school_id: schoolId,
    student_number: validated.student_number || null,
    first_name: validated.first_name,
    middle_name: validated.middle_name || null,
    last_name: validated.last_name,
    email: validated.email.toLowerCase(),
    school_course_id: validated.school_course_id || null,
    school_year: validated.school_year,
    gpa: validated.gpa ?? null,
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
    middle_name: item.middle_name || null,
    last_name: item.last_name,
    email: item.email.toLowerCase(),
    school_course_id: item.school_course_id || null,
    school_year: item.school_year,
    gpa: item.gpa ?? null,
    invitation_status: 'Not Sent',
    created_by: createdByUserId,
  }));

  return await repo.bulkCreateStudentsRepo(payloadList);
}

export async function removeStudentFromRoster(studentId: number): Promise<boolean> {
  return await repo.deleteStudentRepo(studentId);
}
