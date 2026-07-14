// src/modules/school-admin/school-management/types/school.schema.ts
import { z } from 'zod';

export const createSchoolSchema = z.object({
  school_name: z.string().min(1, 'School name is required'),
  school_type: z.enum(['University', 'College', 'Technical/Vocational', 'Other'], {
    required_error: 'School type is required',
  }),
  school_logo_url: z.string().url().optional().or(z.literal('')),
  school_description: z.string().optional(),
  school_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  school_contact_no: z.string().optional(),
  school_website: z.string().url().optional().or(z.literal('')),
  address_line: z.string().optional(),
  barangay: z.string().optional(),
  city_municipality: z.string().min(1, 'City/Municipality is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().optional(),
  country: z.string().default('Philippines'),
  school_status: z.enum(['Active', 'Inactive']).default('Active'),
});

export const updateSchoolSchema = createSchoolSchema.partial();

export const createSchoolCourseSchema = z.object({
  course_name: z.string().min(1, 'Course name is required'),
  course_code: z.string().optional(),
  course_status: z.enum(['Active', 'Inactive']).default('Active'),
});

export const updateSchoolCourseSchema = createSchoolCourseSchema.partial();
