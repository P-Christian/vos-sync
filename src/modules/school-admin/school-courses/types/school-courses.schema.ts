import { z } from 'zod';

export const createCourseSchema = z.object({
  course_name: z.string().min(2, 'Course name must be at least 2 characters'),
  course_code: z.string().nullable().or(z.literal('')).optional(),
});

export const updateCourseSchema = createCourseSchema.extend({
  course_status: z.enum(['Active', 'Inactive', 'Draft', 'Pending']).optional(),
});

export type CreateCourseSchemaType = z.infer<typeof createCourseSchema>;
export type UpdateCourseSchemaType = z.infer<typeof updateCourseSchema>;
