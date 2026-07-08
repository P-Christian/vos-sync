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
