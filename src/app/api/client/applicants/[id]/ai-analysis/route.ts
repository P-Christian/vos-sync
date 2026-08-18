// src/app/api/client/applicants/[id]/ai-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import { callGeminiMonitored } from "@/lib/gemini/geminiMonitoring";

import {
  getActiveApplicationAiAnalysis,
  saveApplicationAiAnalysis,
} from "@/lib/gemini/applicationAiStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.0-flash";

function getDirectusHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Retrieve the currently active AI Candidate Evaluation from DB
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicationId = Number(id);

    if (!applicationId || isNaN(applicationId)) {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
    }

    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const requesterId = getUserIdFromToken(token);
    if (!requesterId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    // Query active evaluation via shared persistence layer
    const record = await getActiveApplicationAiAnalysis(applicationId, "CANDIDATE_EVALUATION");

    if (record) {
      const rawRec =
        typeof record.recommendation === "string"
          ? record.recommendation
          : ((record.recommendation as Record<string, unknown>)?.action as string) ||
            ((record.recommendation as Record<string, unknown>)?.reasoning as string) ||
            "Proceed with screening.";

      const rawScr =
        typeof record.screening_assessment === "string"
          ? record.screening_assessment
          : ((record.screening_assessment as Record<string, unknown>)?.assessment as string) ||
            ((record.screening_assessment as Record<string, unknown>)?.summary as string) ||
            null;

      const analysis = {
        analysis_id: record.analysis_id,
        match_score: Number(record.match_score) || 75,
        fit_level: record.fit_level || "Good Match",
        executive_summary: record.executive_summary || "",
        strengths: Array.isArray(record.strengths) ? record.strengths : [],
        gaps_or_considerations: Array.isArray(record.gaps_or_considerations) ? record.gaps_or_considerations : [],
        screening_assessment: rawScr,
        recommendation: rawRec,
        alternative_job_recommendations: Array.isArray(record.alternative_job_recommendations) ? record.alternative_job_recommendations : [],
        analyzed_at: record.created_at || new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    return NextResponse.json({
      success: true,
      analysis: null,
    });
  } catch (error: unknown) {
    console.error("Error fetching AI candidate analysis:", error);
    return NextResponse.json({ success: true, analysis: null });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Generate fresh AI Evaluation and append new record to DB
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicationId = Number(id);

    if (!applicationId || isNaN(applicationId)) {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
    }

    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const requesterId = getUserIdFromToken(token);
    if (!requesterId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    // Verify company authorization
    const { isVerified } = await checkCompanyVerificationStatus(requesterId);
    if (!isVerified) {
      return NextResponse.json(
        { error: "Only verified employers can run AI candidate evaluations." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const candidateData = body.candidate || null;

    // Fetch Application & Job Posting details from Directus
    const appRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application/${applicationId}?fields=*`,
      { headers: getDirectusHeaders(), cache: "no-store" }
    );

    if (!appRes.ok) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const appJson = await appRes.json();
    const application = appJson.data;

    const jobRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting/${application.job_id}?fields=*`,
      { headers: getDirectusHeaders(), cache: "no-store" }
    );

    const jobPosting = jobRes.ok ? (await jobRes.json()).data : null;

    // Robust Company ID resolution
    let resolvedCompanyId: number | null = null;
    const rawCompanyId = jobPosting?.company_id;
    if (rawCompanyId) {
      if (typeof rawCompanyId === "object" && rawCompanyId !== null) {
        resolvedCompanyId =
          Number(
            (rawCompanyId as Record<string, unknown>).id ||
              (rawCompanyId as Record<string, unknown>).company_id
          ) || null;
      } else {
        resolvedCompanyId = Number(rawCompanyId) || null;
      }
    }

    if (!resolvedCompanyId) {
      try {
        const userCompanyRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${requesterId}&fields=company_id&limit=1`,
          { headers: getDirectusHeaders(), cache: "no-store" }
        );
        if (userCompanyRes.ok) {
          const userCompanyJson = await userCompanyRes.json();
          const cid = userCompanyJson.data?.[0]?.company_id;
          resolvedCompanyId =
            typeof cid === "object" && cid !== null
              ? Number(cid.id || cid.company_id)
              : Number(cid) || null;
        }
      } catch (err) {
        console.warn("[ai-analysis] Error resolving user company:", err);
      }
    }

    let allCompanyJobs: Record<string, unknown>[] = [];
    if (resolvedCompanyId) {
      try {
        const allJobsRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_job_posting?filter[company_id][_eq]=${resolvedCompanyId}&limit=50&fields=*`,
          { headers: getDirectusHeaders(), cache: "no-store" }
        );
        if (allJobsRes.ok) {
          const allJobsJson = await allJobsRes.json();
          allCompanyJobs = allJobsJson.data || [];
        }
      } catch (err) {
        console.warn("[ai-analysis] Error fetching company jobs:", err);
      }
    }

    if (allCompanyJobs.length === 0) {
      try {
        const fallbackJobsRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_job_posting?filter[created_by_user_id][_eq]=${requesterId}&limit=50&fields=*`,
          { headers: getDirectusHeaders(), cache: "no-store" }
        );
        if (fallbackJobsRes.ok) {
          const fallbackJobsJson = await fallbackJobsRes.json();
          allCompanyJobs = fallbackJobsJson.data || [];
        }
      } catch (err) {
        console.warn("[ai-analysis] Error in fallback jobs fetch:", err);
      }
    }

    // Filter active other jobs excluding current job
    const currentJobId = Number(application.job_id);
    const otherActiveJobs = allCompanyJobs
      .filter((j) => {
        const jid = Number(j.job_id);
        if (jid === currentJobId) return false;
        const s = String(j.status || j.job_status || "ACTIVE").toUpperCase();
        return s !== "CLOSED" && s !== "DRAFT" && s !== "ARCHIVED";
      })
      .map((j) => ({
        job_id: Number(j.job_id),
        job_title: String(j.job_title || ""),
        skills_required: String(j.skills_required || j.job_qualifications || ""),
        experience_level: String(j.experience_level || ""),
        job_description: j.job_description ? String(j.job_description).slice(0, 300) : "",
      }));

    const jobContext = {
      job_title: jobPosting?.job_title || candidateData?.job_title || "Target Role",
      job_description: jobPosting?.job_description || "N/A",
      requirements: jobPosting?.job_requirements || "N/A",
      responsibilities: jobPosting?.job_responsibilities || "N/A",
      skills_required: jobPosting?.skills_required || "N/A",
      experience_level: jobPosting?.experience_level || "N/A",
      salary_min: jobPosting?.salary_min || null,
      salary_max: jobPosting?.salary_max || null,
      salary_period: jobPosting?.salary_period || "Monthly",
      work_setup: jobPosting?.work_setup || "Remote",
    };

    const candidateProfile = {
      name: candidateData?.applicant_name || "Applicant",
      email: candidateData?.applicant_email || "N/A",
      phone: candidateData?.applicant_phone || "N/A",
      location: candidateData?.location || "N/A",
      profile_headline: candidateData?.profile_headline || "N/A",
      professional_summary: candidateData?.professional_summary || "N/A",
      expected_salary: candidateData?.expected_salary ?? application.expected_salary ?? "N/A",
      skills: candidateData?.skills || [],
      work_experience: candidateData?.work_experience || [],
      education: candidateData?.education || [],
      certifications: candidateData?.certifications || [],
      screening_answers: candidateData?.screening_answers || [],
      cover_letter: candidateData?.cover_letter ?? application.cover_letter ?? "N/A",
      portfolio_url: candidateData?.portfolio_url ?? application.portfolio_url ?? "N/A",
    };

    const prompt = `
You are a Principal Talent Acquisition AI Specialist.
Analyze the candidate profile thoroughly against the specific applied job posting, and evaluate if they might be an even better or strong viable fit for any other open roles in the same company.

=== APPLIED JOB POSTING ===
Title: ${jobContext.job_title}
Experience Level: ${jobContext.experience_level}
Work Setup: ${jobContext.work_setup}
Salary Budget: ${jobContext.salary_min && jobContext.salary_max ? `${jobContext.salary_min} - ${jobContext.salary_max} / ${jobContext.salary_period}` : "Not specified"}
Job Description: ${jobContext.job_description}
Requirements: ${jobContext.requirements}
Responsibilities: ${jobContext.responsibilities}
Target Skills: ${jobContext.skills_required}

=== OTHER ACTIVE COMPANY OPENINGS (CROSS-MATCHING) ===
${otherActiveJobs.length > 0 ? JSON.stringify(otherActiveJobs, null, 2) : "No other active openings in this company."}

=== CANDIDATE PROFILE ===
Name: ${candidateProfile.name}
Headline: ${candidateProfile.profile_headline}
Location: ${candidateProfile.location}
Expected Salary: ${candidateProfile.expected_salary}
Professional Summary: ${candidateProfile.professional_summary}
Skills: ${JSON.stringify(candidateProfile.skills)}
Work Experience: ${JSON.stringify(candidateProfile.work_experience)}
Education: ${JSON.stringify(candidateProfile.education)}
Certifications: ${JSON.stringify(candidateProfile.certifications)}
Screening Question Answers: ${JSON.stringify(candidateProfile.screening_answers)}
Cover Letter: ${candidateProfile.cover_letter}
Portfolio: ${candidateProfile.portfolio_url}

=== INSTRUCTIONS ===
1. Evaluate hard skills, experience depth, domain knowledge, and qualification fit for the APPLIED role.
2. Review candidate screening answers in depth for role alignment and technical understanding.
3. Calculate an objective match_score (0 to 100) and fit_level for the applied role.
4. CROSS-ROLE EVALUATION:
   - Carefully check the candidate against EVERY OTHER ACTIVE COMPANY OPENING listed in the section above.
   - For example, if the candidate has strong Full-Stack / Web Development / Backend background and there is a role like "Junior Full Stack Developer" or similar, calculate their match score for that position.
   - If ANY other role has a match score of 50% or higher, or where the candidate's core background is an even more natural fit, you MUST include it in "alternative_job_recommendations" with:
     - "job_id": <exact number from the list above>
     - "job_title": "<exact job title from the list above>"
     - "match_score": <integer 0-100>
     - "reasoning": "<1-2 sentence clear reasoning why the candidate fits or excels in this opening>"
   - Order "alternative_job_recommendations" from highest match_score to lowest (up to 4 jobs). If no other openings are listed or none meet 50% match, return [].
5. Provide specific, insightful strengths and gap considerations for the applied role.
6. Output ONLY a valid JSON object matching the exact schema below with NO markdown formatting around it.

Expected JSON schema:
{
  "match_score": 75,
  "fit_level": "Good Match",
  "executive_summary": "Concise 3-4 sentence overview explaining how well this candidate fits the role.",
  "strengths": [
    "Key strength 1 related to job requirements",
    "Key strength 2 with specific proof from profile",
    "Key strength 3"
  ],
  "gaps_or_considerations": [
    "Potential gap or area requiring interview validation 1",
    "Potential gap 2"
  ],
  "screening_assessment": "1-2 sentence review of candidate screening answers and technical depth shown.",
  "recommendation": "Clear recruiter recommendation on next steps and targeted questions to ask.",
  "alternative_job_recommendations": [
    {
      "job_id": 123,
      "job_title": "Junior Full Stack Developer",
      "match_score": 92,
      "reasoning": "Candidate's extensive practical experience in full-stack web development and modern frameworks makes them an exceptional match for this opening."
    }
  ]
}
`;

    const rawResponse = await callGeminiMonitored({
      prompt,
      feature: "BEST_MATCH",
      endpoint: `/api/client/applicants/${applicationId}/ai-analysis`,
      userId: requesterId,
      timeoutMs: 20000,
    });

    if (!rawResponse) {
      return NextResponse.json(
        { error: "AI analysis failed to generate a response. Please try again." },
        { status: 502 }
      );
    }

    let parsedResult;
    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJson);
    } catch {
      console.error("Failed to parse Gemini AI response:", rawResponse);
      return NextResponse.json(
        { error: "Unable to parse AI evaluation format. Please retry." },
        { status: 502 }
      );
    }

    const alternativeJobs = Array.isArray(parsedResult.alternative_job_recommendations)
      ? parsedResult.alternative_job_recommendations.map((alt: Record<string, unknown>) => ({
          job_id: Number(alt.job_id) || 0,
          job_title: String(alt.job_title || ""),
          match_score: Math.min(100, Math.max(0, Number(alt.match_score) || 75)),
          reasoning: String(alt.reasoning || ""),
        }))
      : [];

    const analysis = {
      match_score: Math.min(100, Math.max(0, Number(parsedResult.match_score) || 75)),
      fit_level: parsedResult.fit_level || "Good Match",
      executive_summary: parsedResult.executive_summary || "Candidate matches key criteria.",
      strengths: Array.isArray(parsedResult.strengths) ? parsedResult.strengths : [],
      gaps_or_considerations: Array.isArray(parsedResult.gaps_or_considerations)
        ? parsedResult.gaps_or_considerations
        : [],
      screening_assessment: parsedResult.screening_assessment || null,
      recommendation:
        parsedResult.recommendation || "Proceed with screening interview to validate qualifications.",
      alternative_job_recommendations: alternativeJobs,
      analyzed_at: new Date().toISOString(),
    };

    // ─────────────────────────────────────────────────────────────────────────
    // DB PERSISTENCE: Append new record and supersede previous active record
    // ─────────────────────────────────────────────────────────────────────────
    await saveApplicationAiAnalysis({
      evaluation_mode: "CANDIDATE_EVALUATION",
      application_id: applicationId,
      job_id: Number(application.job_id),
      user_id: Number(application.user_id),
      company_id: resolvedCompanyId || Number(jobPosting?.company_id) || 0,
      match_score: analysis.match_score,
      fit_level: analysis.fit_level,
      executive_summary: analysis.executive_summary,
      strengths: analysis.strengths,
      gaps_or_considerations: analysis.gaps_or_considerations,
      screening_assessment: analysis.screening_assessment ? { assessment: analysis.screening_assessment } : null,
      recommendation: { action: analysis.recommendation },
      alternative_job_recommendations: analysis.alternative_job_recommendations,
      raw_ai_response: parsedResult,
      ai_model: GEMINI_MODEL,
      prompt_version: "1.0",
      evaluated_by_user_id: requesterId,
    }).catch((dbErr) => {
      console.warn("[ai-analysis] Could not persist evaluation to vs_application_ai_analysis table:", dbErr);
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: unknown) {
    console.error("Error in AI candidate analysis route:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
