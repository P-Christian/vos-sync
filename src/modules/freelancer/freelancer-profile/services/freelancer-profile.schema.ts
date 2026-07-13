import { z } from "zod";

export const freelancerSkillSchema = z.object({
    id: z.string(),
    label: z.string(),
});

export const resumeFileSchema = z.object({
    name: z.string(),
    updatedAt: z.string(),
    parsingStatus: z.enum(["OPTIMIZED", "PENDING", "FAILED"]),
});

export const freelancerProfileSchema = z.object({
    id: z.string(),
    fullName: z.string(),
    primaryRole: z.string(),
    email: z.string().email(),
    location: z.string(),
    summary: z.string(),
    skills: z.array(freelancerSkillSchema),
    resumeFile: resumeFileSchema.nullable(),
});

export type FreelancerProfilePayload = z.infer<typeof freelancerProfileSchema>;

export const workExperienceMediaSchema = z.object({
    id: z.number().optional(), // optional because it might be new
    media_type: z.string().min(1),
    media_url: z.string().url(),
    media_title: z.string().nullable().optional(),
    media_description: z.string().nullable().optional(),
});

export const addWorkExperienceSchema = z.object({
    company_name: z.string().min(1, "Company name is required").max(255),
    location: z.string().nullable().optional(),
    location_type: z.string().nullable().optional(),
    job_title: z.string().min(1, "Job title is required").max(255),
    employment_type: z.string().nullable().optional(),
    start_date: z.string().min(1, "Start date is required"), // Expected format YYYY-MM-DD
    end_date: z.string().nullable().optional(),
    is_current_role: z.boolean().default(false),
    job_description: z.string().nullable().optional(),
    discovery_source: z.string().nullable().optional(),
    media: z.array(workExperienceMediaSchema).optional(),
    skills: z.array(z.object({
        skill_id: z.number()
    })).optional(),
});

export const updateWorkExperienceSchema = addWorkExperienceSchema.extend({
    id: z.number(),
});

export const deleteWorkExperienceSchema = z.object({
    id: z.number(),
});

export type AddWorkExperiencePayload = z.infer<typeof addWorkExperienceSchema>;
export type UpdateWorkExperiencePayload = z.infer<typeof updateWorkExperienceSchema>;
export type DeleteWorkExperiencePayload = z.infer<typeof deleteWorkExperienceSchema>;

export const addEducationSchema = z.object({
    institution_name: z.string().min(1, "School Name is required").max(255),
    degree: z.string().nullable().optional(),
    field_of_study: z.string().nullable().optional(),
    graduation_year: z.union([
        z.number().int().min(1900).max(2100),
        z.string().regex(/^\d{4}$/, "Must be a 4-digit year").transform(Number)
    ]),
});

export const updateEducationSchema = addEducationSchema.extend({
    id: z.number(),
});

export const deleteEducationSchema = z.object({
    id: z.number(),
});

export type AddEducationPayload = z.infer<typeof addEducationSchema>;
export type UpdateEducationPayload = z.infer<typeof updateEducationSchema>;
export type DeleteEducationPayload = z.infer<typeof deleteEducationSchema>;
