import { callGeminiSafe } from "./geminiClient";

export interface NormalizedUserProfile {
    professional_summary: string;
    skills: string[];
    preferences: {
        job_type?: string;
        work_setup?: string;
        preferred_location?: string;
        salary_range_min?: number;
        salary_range_max?: number;
        preferred_industry?: string;
    };
}

export interface NormalizedJob {
    job_id: number;
    job_title: string;
    company_name: string;
    job_type: string;
    work_arrangement: string;
    job_location: string;
    description_snippet?: string;
    salary_min?: number;
    salary_max?: number;
    required_skills: string[];
}

export interface JobRecommendation {
    job_id: number;
    reasoning: string;
    job_title?: string;
    company_name?: string;
    job_type?: string;
    work_arrangement?: string;
    salary_min?: number;
    salary_max?: number;
    job_location?: string;
}

/**
 * Generates AI job recommendations for a freelancer based on active job postings.
 * 
 * @param userProfile The normalized freelancer profile
 * @param jobs The list of active normalized job postings to match against
 * @returns Array of JobRecommendation objects, up to 3 best matches
 */
export async function generateJobRecommendations(
    userProfile: NormalizedUserProfile,
    jobs: NormalizedJob[]
): Promise<JobRecommendation[]> {
    if (!jobs || jobs.length === 0) {
        return [];
    }

    const prompt = `
You are an expert AI recruiter matching freelancers with job postings.
I will provide you with a Freelancer Profile JSON and an array of Available Jobs JSON.

Your task:
1. Evaluate the overlap between the freelancer's skills/preferences and each job's requirements.
2. Consider skills match, work setup match (e.g. remote), and salary alignment.
3. Select up to 3 jobs that are the best fit for the user based on the available data.
4. Output ONLY a valid JSON array of objects. Do not wrap it in markdown code blocks like \`\`\`json. Just output the raw JSON array.

Return format exactly like this:
[
  {
    "job_id": 123,
    "reasoning": "A concise 1-2 sentence explanation of why this job is a great fit based on their specific skills and preferences."
  }
]

---
Freelancer Profile:
${JSON.stringify(userProfile, null, 2)}

---
Available Jobs:
${JSON.stringify(jobs, null, 2)}
`;

    const raw = await callGeminiSafe(prompt);
    if (!raw) return [];

    let recommendations: { job_id: number; reasoning: string }[] = [];
    try {
        // Clean markdown if Gemini wraps the response
        const cleanText = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
        recommendations = JSON.parse(cleanText);
        
        if (!Array.isArray(recommendations)) {
            return [];
        }
    } catch {
        console.error("[gemini] ❌ Failed to parse AI job recommendations:", raw);
        return [];
    }

    // Merge original job details back into recommendations for the frontend
    const detailedRecommendations = recommendations
        .filter(rec => typeof rec.job_id === 'number' && typeof rec.reasoning === 'string')
        .map((rec): JobRecommendation | null => {
            const fullJob = jobs.find(j => j.job_id === rec.job_id);
            if (!fullJob) return null;
            
            return {
                job_id: rec.job_id,
                reasoning: rec.reasoning,
                job_title: fullJob.job_title,
                company_name: fullJob.company_name,
                job_type: fullJob.job_type,
                work_arrangement: fullJob.work_arrangement,
                salary_min: fullJob.salary_min,
                salary_max: fullJob.salary_max,
                job_location: fullJob.job_location
            };
        })
        .filter((rec): rec is JobRecommendation => rec !== null);

    return detailedRecommendations;
}
