import { callGeminiSafe, callGeminiWithFile } from "./geminiClient";

export interface ParsedResumeData {
    professional_summary?: string;
    skills?: string[];
    work_experience?: Array<{
        job_title: string;
        company_name: string;
        start_date: string;
        end_date: string | null;
        description: string;
    }>;
    education?: Array<{
        school_name: string;
        course_name: string;
        start_date: string;
        end_date: string | null;
    }>;
}

export async function parseResumeWithGemini(fileBuffer: Buffer, mimeType: string): Promise<ParsedResumeData> {
    const base64Data = fileBuffer.toString("base64");

    const prompt = `You are an expert resume parser. Extract the following information from the provided resume document and return ONLY a valid JSON object matching this structure (no markdown formatting, no comments, just raw JSON):
{
    "professional_summary": "A concise professional summary extracted or inferred from the resume.",
    "skills": ["Skill 1", "Skill 2"],
    "work_experience": [
        {
            "job_title": "Title",
            "company_name": "Company",
            "start_date": "YYYY-MM-DD",
            "end_date": "YYYY-MM-DD or null if present",
            "description": "Responsibilities"
        }
    ],
    "education": [
        {
            "school_name": "School",
            "course_name": "Course/Degree",
            "start_date": "YYYY-MM-DD",
            "end_date": "YYYY-MM-DD or null if present"
        }
    ]
}

If any field is missing from the resume, omit it or set it to null/empty. Ensure the output is valid parseable JSON.`;

    const raw = await callGeminiWithFile(prompt, base64Data, mimeType);
    if (!raw) {
        throw new Error("Failed to extract content from Gemini response.");
    }

    let jsonString = raw.trim();
    if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json/i, '').replace(/```$/, '').trim();
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
        return JSON.parse(jsonString) as ParsedResumeData;
    } catch (e) {
        console.error("[gemini] ❌ Failed to parse Gemini output as JSON:", jsonString);
        throw new Error("Gemini returned invalid JSON.");
    }
}

export async function mergeProfileDataWithGemini(parsedData: ParsedResumeData, currentProfileJson: string): Promise<ParsedResumeData> {
    const prompt = `You are an expert profile data merger. You are given newly extracted data from a resume, and the user's existing profile data. 
Your task is to merge the newly extracted data into the existing profile data smartly.
- Deduplicate skills. Do not add exact duplicate skills. 
- Avoid duplicate work experience or education entries. If a new entry is identical or highly similar to an existing one, ignore the new one or merge their descriptions if beneficial.
- For professional summary, if the user already has one, you may combine them or prefer the existing one if it's longer. Use your best judgment.
- Output ONLY a valid JSON object matching the 'ParsedResumeData' structure.

Newly Extracted Data from Resume:
${JSON.stringify(parsedData, null, 2)}

User's Existing Profile Data:
${currentProfileJson}

Return ONLY the final merged data as a JSON object matching this structure (no markdown formatting, no comments):
{
    "professional_summary": "...",
    "skills": ["Skill 1", "Skill 2"],
    "work_experience": [
        {
            "job_title": "Title",
            "company_name": "Company",
            "start_date": "YYYY-MM-DD",
            "end_date": "YYYY-MM-DD or null if present",
            "description": "Responsibilities"
        }
    ],
    "education": [
        {
            "school_name": "School",
            "course_name": "Course/Degree",
            "start_date": "YYYY-MM-DD",
            "end_date": "YYYY-MM-DD or null if present"
        }
    ]
}`;

    const raw = await callGeminiSafe(prompt);
    if (!raw) {
        return parsedData; // Fallback to parsed data if merge fails silently
    }

    let jsonString = raw.trim();
    if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json/i, '').replace(/```$/, '').trim();
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
        return JSON.parse(jsonString) as ParsedResumeData;
    } catch (e) {
        console.error("[gemini] ❌ Failed to parse Gemini merge output as JSON:", jsonString);
        return parsedData; // Fallback
    }
}
