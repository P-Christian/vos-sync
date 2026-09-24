// src/modules/school-admin/success-metrics/types/success-metrics.schema.ts
import { z } from 'zod';

export const SuccessMetricsFilterSchema = z.object({
  school_id: z.coerce.number().positive(),
  school_year: z.string().optional(),
  school_course_id: z.coerce.number().optional(),
  is_alumni: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true' || val === '1') return true;
        if (val.toLowerCase() === 'false' || val === '0') return false;
      }
      return val;
    }, z.boolean())
    .optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const AiMetricsInsightRequestSchema = z.object({
  schoolName: z.string().optional(),
  totalStudents: z.number().nonnegative(),
  registeredStudents: z.number().nonnegative(),
  hiredCount: z.number().nonnegative(),
  placementRate: z.number().nonnegative(),
  activePipelineCount: z.number().nonnegative(),
  avgTimeToHireDays: z.number().nonnegative(),
  topCourse: z.string().nullable().optional(),
  courseStatsSummary: z.array(
    z.object({
      courseName: z.string(),
      placementRate: z.number(),
      hiredCount: z.number(),
    })
  ),
  topCompaniesSummary: z.array(
    z.object({
      companyName: z.string(),
      hiredCount: z.number(),
    })
  ),
});

export type SuccessMetricsFilterInput = z.infer<typeof SuccessMetricsFilterSchema>;
export type AiMetricsInsightRequestInput = z.infer<typeof AiMetricsInsightRequestSchema>;
