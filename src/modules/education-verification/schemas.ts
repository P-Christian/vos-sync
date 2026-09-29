import "server-only";

import { z } from "zod";

const nullableInteger = z.number().int().nullable();
const requesterIdSchema = z
  .union([z.number().int(), z.object({ user_id: z.number().int() })])
  .transform((value) => (typeof value === "number" ? value : value.user_id));

export const userSchema = z.object({
  user_id: z.number().int(),
  user_fname: z.string(),
  user_mname: z.string().nullable(),
  user_lname: z.string(),
  user_email: z.string().nullable(),
});

export const educationSchema = z.object({
  employee_education_id: z.number().int(),
  user_id: z.number().int(),
  school_id: nullableInteger,
  school_course_id: nullableInteger,
  school_name_raw: z.string().nullable(),
  course_name_raw: z.string().nullable(),
  education_status: z.enum(["Pending", "Verified", "Unverified"]),
  end_date: z.string().nullable(),
});

export const rosterSchema = z.object({
  student_id: z.number().int(),
  school_id: z.number().int(),
  student_number: z.string().nullable(),
  first_name: z.string(),
  middle_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  school_course_id: nullableInteger,
  school_year: z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .nullable(),
  gpa: z
    .union([z.number(), z.string().transform((value) => Number(value))])
    .nullable(),
  is_alumni: z
    .union([z.boolean(), z.number().int()])
    .transform((value) => value === true || value === 1),
  employee_education_id: nullableInteger,
  invitation_status: z.enum(["Not Sent", "Invited", "Registered"]),
  registered_user_id: nullableInteger,
});

export const attendanceEvidenceSchema = z.object({
  school_request_id: z.number().int(),
  employee_education_id: z.number().int(),
  matched_school_id: z.number().int(),
  request_status: z.literal("Approved"),
});

export const activeCourseSchema = z.object({
  school_course_id: z.number().int(),
  school_id: z.number().int(),
  course_name: z.string(),
  course_code: z.string().nullable(),
  degree: z.string().nullable(),
  course_status: z.literal("Active"),
  created_by: z.number().int(),
  created_at: z.string(),
  updated_by: nullableInteger,
  updated_at: z.string().nullable(),
});

export const courseRequestSchema = z.object({
  course_request_id: z.number().int(),
  employee_education_id: z.number().int(),
  school_id: z.number().int(),
  requested_by: requesterIdSchema,
  requested_course_name: z.string(),
  request_status: z.enum([
    "Pending",
    "Approved",
    "Rejected",
    "RoutedToSchool",
  ]),
  matched_school_course_id: nullableInteger,
  reviewed_by: nullableInteger,
  reviewed_at: z.string().nullable(),
  routed_by: nullableInteger,
  routed_at: z.string().nullable(),
  admin_remarks: z.string().nullable(),
});

export type AuthoritativeUser = z.infer<typeof userSchema>;
export type EducationRecord = z.infer<typeof educationSchema>;
export type AttendanceRosterRecord = z.infer<typeof rosterSchema>;
export type ApprovedAttendanceEvidence = z.infer<
  typeof attendanceEvidenceSchema
>;
export type ActiveSchoolCourse = z.infer<typeof activeCourseSchema>;
export type CourseRequestRecord = z.infer<typeof courseRequestSchema>;
