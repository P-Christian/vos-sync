// src/app/api/freelancer/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { sendApplicationSubmittedEmail, sendNewApplicationReceivedEmail } from "@/lib/mail";
import { createSystemMessage } from "@/lib/messaging/system-message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
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
// GET — Fetch logged-in freelancer's own applications
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    // Fetch applications for this user
    const appRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?filter[user_id][_eq]=${userId}&sort[]=-applied_at&fields=application_id,job_id,user_id,application_status,cover_letter,expected_salary,portfolio_url,client_notes,applied_at,status_updated_at&limit=200`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!appRes.ok) {
      const err = await appRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.errors?.[0]?.message ?? "Failed to load applications." },
        { status: appRes.status }
      );
    }

    const appJson = await appRes.json();
    const applications: Record<string, unknown>[] = appJson.data ?? [];

    if (applications.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    // Enrich with job details (title, type, location, work_arrangement)
    const jobIds = [...new Set(applications.map((a) => a.job_id as number))];
    const jobsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title,job_type,job_location,work_arrangement,company_id&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );

    const jobsMap: Record<number, Record<string, unknown>> = {};
    if (jobsRes.ok) {
      const jobsJson = await jobsRes.json();
      const jobs: Record<string, unknown>[] = jobsJson.data ?? [];
      jobs.forEach((j) => {
        jobsMap[j.job_id as number] = j;
      });
    }

    // Enrich with company names
    const companyIds = [
      ...new Set(
        Object.values(jobsMap)
          .map((j) => j.company_id as number)
          .filter(Boolean)
      ),
    ];
    const companyMap: Record<number, string> = {};
    if (companyIds.length > 0) {
      const compRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${companyIds.join(",")}&fields=company_id,company_name&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (compRes.ok) {
        const compJson = await compRes.json();
        const companies: Record<string, unknown>[] = compJson.data ?? [];
        companies.forEach((c) => {
          companyMap[c.company_id as number] = c.company_name as string;
        });
      }
    }

    // Enrich with screening answers from vs_job_application_answer & vs_job_screening_question
    const appIds = applications.map((a) => a.application_id as number);
    const screeningMap: Record<number, { question_id: number; question_text: string; answer_text: string }[]> = {};
    if (appIds.length > 0) {
      const ansRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_application_answer?filter[application_id][_in]=${appIds.join(",")}&fields=application_id,question_id,answer_text&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (ansRes.ok) {
        const ansJson = await ansRes.json();
        const ansList: { application_id: number; question_id: number; answer_text: string }[] = ansJson.data ?? [];
        const qIds = [...new Set(ansList.map((a) => a.question_id).filter(Boolean))];

        const qTextMap: Record<number, string> = {};
        if (qIds.length > 0) {
          const qRes = await fetch(
            `${DIRECTUS_BASE}/items/vs_job_screening_question?filter[question_id][_in]=${qIds.join(",")}&fields=question_id,question_text&limit=500`,
            { headers: getHeaders(), cache: "no-store" }
          );
          if (qRes.ok) {
            const qJson = await qRes.json();
            const qList: { question_id: number; question_text: string }[] = qJson.data ?? [];
            qList.forEach((q) => {
              qTextMap[q.question_id] = q.question_text;
            });
          }
        }

        ansList.forEach((a) => {
          if (!screeningMap[a.application_id]) screeningMap[a.application_id] = [];
          screeningMap[a.application_id].push({
            question_id: a.question_id,
            question_text: qTextMap[a.question_id] || `Question #${a.question_id}`,
            answer_text: a.answer_text,
          });
        });
      }
    }

    // Merge all data
    const enriched = applications.map((app) => {
      const job = jobsMap[app.job_id as number] ?? {};
      const companyId = job.company_id as number;
      const appId = app.application_id as number;
      return {
        ...app,
        job_title: job.job_title ?? null,
        job_type: job.job_type ?? null,
        job_location: job.job_location ?? null,
        work_arrangement: job.work_arrangement ?? null,
        company_name: companyId ? (companyMap[companyId] ?? null) : null,
        screening_answers: screeningMap[appId] ?? null,
      };
    });

    return NextResponse.json({ applications: enriched });
  } catch (err: unknown) {
    console.error("GET /api/freelancer/applications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Submit a new job application
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.job_id) {
      return NextResponse.json({ error: "job_id is required." }, { status: 400 });
    }

    // Check for duplicate application
    const dupCheck = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?filter[job_id][_eq]=${body.job_id}&filter[user_id][_eq]=${userId}&fields=application_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (dupCheck.ok) {
      const dupJson = await dupCheck.json();
      if ((dupJson.data ?? []).length > 0) {
        return NextResponse.json(
          { error: "You have already applied to this job." },
          { status: 409 }
        );
      }
    }

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const payload = {
      job_id: Number(body.job_id),
      user_id: userId,
      application_status: "APPLIED",
      cover_letter: body.cover_letter?.trim() || null,
      expected_salary: body.expected_salary ? Number(body.expected_salary) : null,
      portfolio_url: body.portfolio_url?.trim() || null,
      applied_at: nowPH,
    };

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_application?fields=application_id,job_id,user_id,application_status,cover_letter,expected_salary,portfolio_url,client_notes,applied_at,status_updated_at`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to submit application." },
        { status: res.status }
      );
    }

    // Trigger notification
    await createNotification({
      event_type: "application_submitted",
      recipient_user_id: userId,
      entity_type: "job_application",
      entity_id: json.data?.application_id,
      category: "Application Updates",
      title: "Application Submitted!",
      message: "Your application has been received. We will notify you of any updates.",
      action_url: "/vos-sync/freelancer/applications",
    });
    const createdApp = json.data;
    const applicationId = createdApp?.application_id;

    if (applicationId && Array.isArray(body.screening_answers) && body.screening_answers.length > 0) {
      let answersToInsert = body.screening_answers;
      const needsQuestionIds = answersToInsert.some((a: Record<string, unknown>) => !a.question_id);
      if (needsQuestionIds) {
        const qRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_job_screening_question?filter[job_id][_eq]=${body.job_id}&fields=question_id,question_text&sort[]=question_id`,
          { headers: getHeaders(), cache: "no-store" }
        );
        if (qRes.ok) {
          const qJson = await qRes.json();
          const qList: { question_id: number; question_text: string }[] = qJson.data ?? [];
          answersToInsert = answersToInsert.map((ans: Record<string, unknown>, idx: number) => ({
            question_id: ans.question_id || qList[idx]?.question_id,
            answer_text: typeof ans === "string" ? ans : (ans.answer_text as string),
          }));
        }
      }

      for (const ans of answersToInsert) {
        const qId = (ans as Record<string, unknown>).question_id;
        const text = ((ans as Record<string, unknown>).answer_text as string)?.trim();
        if (qId && text) {
          await fetch(`${DIRECTUS_BASE}/items/vs_job_application_answer`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              application_id: applicationId,
              question_id: Number(qId),
              answer_text: text,
              created_at: nowPH,
            }),
          }).catch((e) => console.error("Error inserting screening answer:", e));
        }
      }
    }

    // Dispatch email notification to candidate and employer company
    try {
      const userRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}?fields=user_email,user_fname,user_lname`, {
        headers: getHeaders(),
        cache: "no-store",
      });
      if (userRes.ok) {
        const u = (await userRes.json()).data;
        const candidateName = `${u?.user_fname ?? ""} ${u?.user_lname ?? ""}`.trim() || "Candidate";
        const candidateEmail = u?.user_email ?? "";

        let jobTitle = "Unknown Position";
        let companyName = "Employer";
        let companyEmail = "";
        let companyId: number | null = null;

        const jobRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${body.job_id}?fields=job_title,company_id`, {
          headers: getHeaders(),
          cache: "no-store",
        });
        if (jobRes.ok) {
          const jData = (await jobRes.json()).data;
          if (jData?.job_title) jobTitle = jData.job_title;
          if (jData?.company_id) {
            companyId = Number(jData.company_id);
            const compRes = await fetch(`${DIRECTUS_BASE}/items/vs_company/${jData.company_id}?fields=company_name,company_email`, {
              headers: getHeaders(),
              cache: "no-store",
            });
            if (compRes.ok) {
              const compData = (await compRes.json()).data;
              companyName = compData?.company_name || companyName;
              companyEmail = compData?.company_email || "";
            }
          }
        }

        // 1. Send confirmation email to candidate
        if (candidateEmail) {
          await sendApplicationSubmittedEmail(candidateEmail, {
            candidateName,
            companyName,
            jobTitle,
            appliedAt: nowPH,
          }).catch((err) => console.error("Candidate application email dispatch error:", err));
        }

        // 2. Send new application notification email to employer company email
        if (companyEmail) {
          await sendNewApplicationReceivedEmail(companyEmail, {
            companyName,
            jobTitle,
            candidateName,
            candidateEmail,
            expectedSalary: body.expected_salary ?? null,
            appliedAt: nowPH,
            applicationId: Number(applicationId),
          }).catch((err) => console.error("Employer application alert email error:", err));
        }

        // 3. Generate System Message for Conversation
        if (companyId) {
          const compUserRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_user?filter[company_id][_eq]=${companyId}&fields=user_id&limit=1`, { headers: getHeaders(), cache: "no-store" });
          if (compUserRes.ok) {
            const cuData = (await compUserRes.json()).data;
            const clientId = cuData?.[0]?.user_id;
            if (clientId) {
              await createSystemMessage({
                clientId: Number(clientId),
                freelancerId: userId,
                jobId: Number(body.job_id),
                text: `${candidateName} applied for "${jobTitle}"`,
                senderId: userId,
              }).catch((err) => console.error("Error creating application system message:", err));
            }
          }
        }
      }
    } catch (mailErr) {
      console.error("Error sending application emails:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully.",
      application: createdApp,
    });
  } catch (err: unknown) {
    console.error("POST /api/freelancer/applications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
