// src/modules/school-admin/school-profile/types/school-profile.schema.ts
import { z } from 'zod';

export const updateSchoolProfileSchema = z.object({
  school_name: z.string().min(2, 'School name must be at least 2 characters'),
  school_type: z.enum(['University', 'College', 'Technical/Vocational', 'Other']),
  school_logo_url: z.string().nullable().optional().or(z.literal('')),
  school_cover: z.string().nullable().optional().or(z.literal('')),
  school_description: z.string().nullable().optional().or(z.literal('')),
  school_mission: z.string().nullable().optional().or(z.literal('')),
  school_values: z.string().nullable().optional().or(z.literal('')),
  school_email: z.string().email('Invalid email format').nullable().optional().or(z.literal('')),
  school_contact_no: z.string().nullable().optional().or(z.literal('')),
  school_website: z.string().nullable().optional().or(z.literal('')),
  school_facebook: z.string().nullable().optional().or(z.literal('')),
  school_linkedin: z.string().nullable().optional().or(z.literal('')),
  address_line: z.string().nullable().optional().or(z.literal('')),
  barangay: z.string().nullable().optional().or(z.literal('')),
  city_municipality: z.string().min(1, 'City/Municipality is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().nullable().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  is_public: z.union([z.boolean(), z.number()]).optional(),
});

export type UpdateSchoolProfileSchemaType = z.infer<typeof updateSchoolProfileSchema>;
