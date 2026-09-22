import { z } from 'zod';

export const createCourseSchema = z.object({
  course_name: z.string().min(2, 'Course name must be at least 2 characters'),
  course_code: z.string().nullable().or(z.literal('')).optional(),
  degree: z.enum(['Associate', 'Bachelor', 'Master', 'Doctorate'], {
    message: 'Degree level is required',
  }),
});


export const updateCourseSchema = z.object({
  course_name: z.string().min(2, 'Course name must be at least 2 characters').optional(),
  course_code: z.string().nullable().or(z.literal('')).optional(),
  degree: z.enum(['Associate', 'Bachelor', 'Master', 'Doctorate']).optional(),
  course_status: z.enum(['Active', 'Inactive']).optional(),
});

export type CreateCourseSchemaType = z.infer<typeof createCourseSchema>;
export type UpdateCourseSchemaType = z.infer<typeof updateCourseSchema>;

