import { z } from 'zod';

export const updateSchoolProfileSchema = z.object({
  school_name: z.string().min(2, 'School name must be at least 2 characters'),
  school_type: z.enum(['University', 'College', 'Technical/Vocational', 'Other']),
  school_email: z.string().email('Invalid email format').nullable().or(z.literal('')),
  school_contact_no: z.string().nullable().or(z.literal('')),
  school_website: z.string().url('Invalid website URL').nullable().or(z.literal('')),
  school_logo_url: z.string().nullable().or(z.literal('')),
  school_description: z.string().nullable().or(z.literal('')),
  address_line: z.string().nullable().or(z.literal('')),
  barangay: z.string().nullable().or(z.literal('')),
  city_municipality: z.string().min(1, 'City/Municipality is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().nullable().or(z.literal('')),
  country: z.string().min(1, 'Country is required'),
});

export type UpdateSchoolProfileSchemaType = z.infer<typeof updateSchoolProfileSchema>;
