import { z } from "zod";

export const uploadResumeSchema = z.object({
    file_name: z.string().max(255).optional(),
});

export const setPrimaryResumeSchema = z.object({
    id: z.number(),
});

export const deleteResumeSchema = z.object({
    id: z.number(),
});
