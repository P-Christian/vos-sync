import { z } from 'zod';

export const createStudentSchema = z.object({
  student_number: z.string().trim().nullable().optional(),
  first_name: z.string().trim().min(1, 'First name is required'),
  middle_name: z.string().trim().nullable().optional(),
  last_name: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address format'),
  school_course_id: z.number().nullable().optional(),
  school_year: z.string().trim().min(1, 'School year is required'),
  gpa: z.number().min(0).max(5.0).nullable().optional(),
});

export const bulkStudentSchema = z.array(createStudentSchema).min(1, 'At least one student record is required');

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type BulkStudentInput = z.infer<typeof bulkStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
