// src/modules/school-admin/request-management/types/request.schema.ts

import { z } from 'zod';

export const approveSchoolRequestSchema = z.object({
  action: z.literal('Approved'),
  matched_school_id: z.number({
    message: 'A matched school ID is required for approval.',
  }).min(1, 'A matched school ID is required for approval.'),
  admin_remarks: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  action: z.literal('Rejected'),
  admin_remarks: z.string().min(1, 'Admin remarks are required when rejecting a request.'),
});

// We can accept either approve or reject for the review endpoint
export const reviewSchoolRequestSchema = z.discriminatedUnion('action', [
  approveSchoolRequestSchema,
  rejectRequestSchema,
]);

export const approveCourseRequestSchema = z.object({
  action: z.literal('Approved'),
  matched_school_course_id: z.number({
    message: 'A matched course ID is required for approval.',
  }).min(1, 'A matched course ID is required for approval.'),
  admin_remarks: z.string().optional(),
});

export const reviewCourseRequestSchema = z.discriminatedUnion('action', [
  approveCourseRequestSchema,
  rejectRequestSchema,
]);

export const createSchoolRequestSchema = z.object({
  requested_school_name: z.string().min(1, 'Proposed school name is required.'),
  city_municipality: z.string().optional(),
  province: z.string().optional(),
});

export const createCourseRequestSchema = z.object({
  school_id: z.number({ 
    message: 'School selection is required.' 
  }).min(1, 'School selection is required.'),

  requested_course_name: z.string().min(1, 'Proposed course name is required.'),
  requested_course_code: z.string().optional(),
});

