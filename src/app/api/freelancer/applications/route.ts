// src/app/api/freelancer/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { createEmployerNotification } from "@/lib/notifications/services/employer-notifications";
import { sendApplicationSubmittedEmail, sendNewApplicationReceivedEmail, isEmailEnabledForUser } from "@/lib/mail";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { handleApplicationSubmissionReferral } from "@/modules/freelancer/freelancer-referrals/services/referral.service";
import { getFreelancerProfile } from "@/modules/freelancer/freelancer-profile/services/freelancer-profile.service";

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
      `${DIRECTUS_BASE}/items/vs_job_application?filter[user_id][_eq]=${userId}&sort[]=-applied_at&fields=application_id,job_id,user_id,application_status,cover_letter,expected_salary,portfolio_url,client_notes,applied_at,status_updated_at,resume_id&limit=200`,
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
      `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title,job_description,job_type,job_location,work_arrangement,experience_level,company_id&limit=500`,
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
    const companyMap: Record<number, Record<string, unknown>> = {};
    if (companyIds.length > 0) {
      const companyFields = [
        "company_id", "company_name", "company_legal_name", "company_email", "company_contact",
        "company_website", "company_description", "company_mission", "company_vision", "company_culture",
        "company_benefits", "industry_id", "company_size_id", "year_established", "company_province",
        "company_city", "company_brgy", "company_address", "company_zipCode", "registration_no",
        "company_tin", "company_logo", "company_cover", "company_facebook", "company_linkedin",
        "company_instagram", "company_x", "company_youtube", "company_tags", "verification_status",
        "is_public", "is_active"
      ].join(",");
      const compRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${companyIds.join(",")}&filter[is_public][_eq]=true&fields=${companyFields}&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (compRes.ok) {
        const compJson = await compRes.json();
        const companies: Record<string, unknown>[] = compJson.data ?? [];
        companies.forEach((c) => {
          companyMap[c.company_id as number] = c;
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

    // Enrich with resume details
    const resumeIds = [...new Set(applications.map((a) => a.resume_id as number).filter(Boolean))];
    const resumeMap: Record<number, { file_name: string; file_url: string }> = {};
    if (resumeIds.length > 0) {
      const resRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_seeker_resumes?filter[id][_in]=${resumeIds.join(",")}&fields=id,file_name,file_url&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (resRes.ok) {
        const resJson = await resRes.json();
        const resumes: Record<string, unknown>[] = resJson.data ?? [];
        resumes.forEach((r) => {
          resumeMap[r.id as number] = {
            file_name: r.file_name as string,
            file_url: r.file_url as string,
          };
        });
      }
    }

    // Merge all data
    const enriched = applications.map((app) => {
      const job = jobsMap[app.job_id as number] ?? {};
      const companyId = job.company_id as number;
      const appId = app.application_id as number;
      const company = companyId ? companyMap[companyId] : null;
      return {
        ...app,
        job_title: job.job_title ?? null,
        job_description: job.job_description ?? null,
        job_type: job.job_type ?? null,
        job_location: job.job_location ?? null,
        work_arrangement: job.work_arrangement ?? null,
        experience_level: job.experience_level ?? null,
        company_id: companyId ?? null,
        company_name: company?.company_name ?? null,
        company_details: company ?? null,
        screening_answers: screeningMap[appId] ?? null,
        resume: app.resume_id ? (resumeMap[app.resume_id as number] ?? null) : null,
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

    const isDraft = !!body?.is_draft;

    // Check for existing application (draft or submitted)
    const dupCheck = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?filter[job_id][_eq]=${body.job_id}&filter[user_id][_eq]=${userId}&fields=application_id,application_status,draft_version,draft_started_at&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    
    let existingApplication: any = null;
    if (dupCheck.ok) {
      const dupJson = await dupCheck.json();
      existingApplication = dupJson.data?.[0] || null;
    }

    if (existingApplication) {
      const status = existingApplication.application_status;
      // If it is not a draft and not withdrawn/rejected, it's an active application
      if (status !== "DRAFT" && status !== "WITHDRAWN" && status !== "REJECTED") {
        return NextResponse.json(
          { error: "You already have an active application for this job." },
          { status: 409 }
        );
      }
    }

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Resolve resume_id
    let resumeId: number | null = null;

    if (body.custom_resume?.file_path) {
      // User uploaded a new resume
      // 1. Unset existing primary resumes
      const existingResumesRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_seeker_resumes?filter[user_id][_eq]=${userId}&filter[is_primary][_eq]=true&fields=id`, {
        headers: getHeaders(),
        cache: "no-store"
      });
      if (existingResumesRes.ok) {
        const existingData = await existingResumesRes.json();
        const existingIds = (existingData.data ?? []).map((r: Record<string, unknown>) => r.id);
        for (const rId of existingIds) {
          await fetch(`${DIRECTUS_BASE}/items/vs_job_seeker_resumes/${rId}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify({ is_primary: false })
          });
        }
      }

      // 2. Create the new resume as primary
      const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_seeker_resumes`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          user_id: userId,
          file_name: body.custom_resume.file_name || "Resume.pdf",
          file_path: body.custom_resume.file_path,
          file_url: body.custom_resume.file_path,
          is_primary: true,
        }),
      });
      if (createRes.ok) {
        const createdData = await createRes.json();
        resumeId = createdData.data?.id;
      }
    } else {
      // User didn't upload a new resume. Fetch existing primary resume.
      const primaryRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_seeker_resumes?filter[user_id][_eq]=${userId}&filter[is_primary][_eq]=true&fields=id&limit=1`, {
        headers: getHeaders(),
        cache: "no-store"
      });
      if (primaryRes.ok) {
        const primaryData = await primaryRes.json();
        resumeId = primaryData.data?.[0]?.id || null;
      }
    }

    const nextVersion = (existingApplication?.draft_version || 0) + 1;
    const payload: any = {
      job_id: Number(body.job_id),
      user_id: userId,
      application_status: isDraft ? "DRAFT" : "APPLIED",
      cover_letter: body.cover_letter?.trim() || null,
      expected_salary: body.expected_salary ? Number(body.expected_salary) : null,
      portfolio_url: body.portfolio_url?.trim() || null,
      resume_id: resumeId,
      status_updated_at: nowPH,
      draft_version: nextVersion,
    };

    if (isDraft) {
      if (!existingApplication?.draft_started_at) {
        payload.draft_started_at = nowPH;
      }
    } else {
      payload.submitted_at = nowPH;
    }

    let res;
    const fieldsQuery = "fields=application_id,job_id,user_id,application_status,cover_letter,expected_salary,portfolio_url,client_notes,applied_at,status_updated_at,resume_id,draft_version";

    if (existingApplication) {
      res = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${existingApplication.application_id}?${fieldsQuery}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
    } else {
      if (isDraft) {
        payload.draft_started_at = nowPH;
      } else {
        payload.applied_at = nowPH;
      }
      res = await fetch(`${DIRECTUS_BASE}/items/vs_job_application?${fieldsQuery}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
    }

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to save application." },
        { status: res.status }
      );
    }

    const createdApp = json.data;
    const applicationId = createdApp?.application_id;

    // Handle screening answers (saved both for drafts and submitted applications)
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

      // Clear existing answers first to support updating drafts cleanly
      const oldAnswersRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_application_answer?filter[application_id][_eq]=${applicationId}&fields=id`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (oldAnswersRes.ok) {
        const oldAnswers = await oldAnswersRes.json();
        const oldIds = (oldAnswers.data ?? []).map((a: any) => a.id);
        for (const aId of oldIds) {
          await fetch(`${DIRECTUS_BASE}/items/vs_job_application_answer/${aId}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
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

    // Submission specific logic (Snapshots, Consent, History, Referrals, Notifications)
    if (!isDraft && applicationId) {
      // 1. Capture Profile Snapshot
      try {
        const profile = await getFreelancerProfile(token).catch(() => null);
        if (profile) {
          const snapshotPayload = {
            application_id: applicationId,
            snapshot_schema_version: "1.0",
            profile_data: {
              professional_summary: (profile.job_seeker_profile as any)?.[0]?.professional_summary || (profile.job_seeker_profile as any)?.professional_summary || "",
              skills: profile.skills || [],
              work_experience: profile.work_experience || [],
              education: profile.education || [],
              user_fname: profile.user_fname,
              user_lname: profile.user_lname,
              user_email: profile.user_email,
              user_contact: profile.user_contact,
              user_city: profile.user_city,
              user_province: profile.user_province,
            },
            captured_at: nowPH,
          };
          await fetch(`${DIRECTUS_BASE}/items/vs_job_application_profile_snapshot`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(snapshotPayload),
          });
        }
      } catch (snapErr) {
        console.error("Failed to capture profile snapshot:", snapErr);
      }

      // 2. Capture Consent Signature
      try {
        if (body.consent_accepted) {
          const consentPayload = {
            application_id: applicationId,
            consent_type: "application_acknowledgement",
            consent_text: body.consent_text || "I confirm the information is accurate and accept the application consent.",
            consent_hash: body.consent_hash || "default_consent_hash",
            accepted_at: nowPH,
          };
          await fetch(`${DIRECTUS_BASE}/items/vs_job_application_consent`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(consentPayload),
          });
        }
      } catch (consentErr) {
        console.error("Failed to capture consent:", consentErr);
      }

      // 3. Write Status History Transition
      try {
        const historyPayload = {
          application_id: applicationId,
          from_status: existingApplication?.application_status || null,
          to_status: "APPLIED",
          actor: "Freelancer",
          actor_user_id: userId,
          occurred_at: nowPH,
        };
        await fetch(`${DIRECTUS_BASE}/items/vs_job_application_status_history`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(historyPayload),
        });
      } catch (histErr) {
        console.error("Failed to log status history:", histErr);
      }

      // Trigger notification
      await createNotification({
        event_type: "application_submitted",
        recipient_user_id: userId,
        entity_type: "job_application",
        entity_id: applicationId,
        category: "Application Updates",
        title: "Application Submitted!",
        message: "Your application has been received. We will notify you of any updates.",
        action_url: "/vos-sync/freelancer/applications",
      }).catch((e) => console.error("Error creating candidate notification:", e));

      // Referrals
      try {
        await handleApplicationSubmissionReferral(Number(applicationId), userId, Number(body.job_id));
      } catch (err) {
        console.error("Failed to run referral association on application submit:", err);
      }

      // Dispatch emails & employer notifications
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

          // Email confirmation to candidate
          if (candidateEmail) {
            const candidateEmailEnabled = await isEmailEnabledForUser(userId, "APPLICATION_STATUS_UPDATED");
            if (candidateEmailEnabled) {
              await sendApplicationSubmittedEmail(candidateEmail, {
                candidateName,
                companyName,
                jobTitle,
                appliedAt: nowPH,
              }).catch((err) => console.error("Candidate email error:", err));
            }
          }

          // New application notification email to employer
          if (companyEmail && companyId) {
            const compUserRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_user?filter[company_id][_eq]=${companyId}&fields=user_id&limit=1`, { headers: getHeaders(), cache: "no-store" });
            let employerUserId: number | null = null;
            if (compUserRes.ok) {
              const cuData = (await compUserRes.json()).data;
              employerUserId = cuData?.[0]?.user_id ? Number(cuData[0].user_id) : null;
            }

            const employerEmailEnabled = await isEmailEnabledForUser(employerUserId, "APPLICATION_RECEIVED");
            if (employerEmailEnabled) {
              await sendNewApplicationReceivedEmail(companyEmail, {
                companyName,
                jobTitle,
                candidateName,
                candidateEmail,
                expectedSalary: body.expected_salary ?? null,
                appliedAt: nowPH,
                applicationId: Number(applicationId),
              }).catch((err) => console.error("Employer email error:", err));
            }
          }

          // Employer in-app notification
          if (companyId) {
            const compUserRes2 = await fetch(`${DIRECTUS_BASE}/items/vs_company_user?filter[company_id][_eq]=${companyId}&fields=user_id&limit=1`, { headers: getHeaders(), cache: "no-store" });
            if (compUserRes2.ok) {
              const cu2Data = (await compUserRes2.json()).data;
              const employerUserId2: number | null = cu2Data?.[0]?.user_id ? Number(cu2Data[0].user_id) : null;
              if (employerUserId2) {
                await createEmployerNotification({
                  event_type: "APPLICATION_RECEIVED",
                  recipient_user_id: employerUserId2,
                  entity_type: "job_application",
                  entity_id: Number(applicationId),
                  category: "APPLICATION_RECEIVED",
                  title: "New Application Received",
                  message: `${candidateName} applied for "${jobTitle}".`,
                  action_url: `/vos-sync/client/applicants/${applicationId}`,
                }).catch((err: unknown) => console.error("[Employer in-app] APPLICATION_RECEIVED error:", err));
              }
            }
          }

          // Chat System Message
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
                  systemEventType: "APPLICATION_SUBMITTED",
                  applicationId: Number(applicationId),
                }).catch((err) => console.error("Error creating application system message:", err));
              }
            }
          }
        }
      } catch (mailErr) {
        console.error("Error sending application emails:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: isDraft ? "Draft saved successfully." : "Application submitted successfully.",
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

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Handle withdrawal of application
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.application_id) {
      return NextResponse.json({ error: "application_id is required." }, { status: 400 });
    }

    // 1. Fetch application details
    const appRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application/${body.application_id}?fields=application_id,user_id,application_status,job_id`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!appRes.ok) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    const appData = (await appRes.json()).data;
    if (appData.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden. You do not own this application." }, { status: 403 });
    }

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    if (body.action === "withdraw") {
      const allowedFrom = ["DRAFT", "APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED"];
      if (!allowedFrom.includes(appData.application_status)) {
        return NextResponse.json(
          { error: `Cannot withdraw application when status is ${appData.application_status}.` },
          { status: 409 }
        );
      }

      // Update application
      const updateRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${body.application_id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          application_status: "WITHDRAWN",
          withdrawn_at: nowPH,
          withdrawal_reason: body.reason || null,
          status_updated_at: nowPH,
        }),
      });

      if (!updateRes.ok) {
        return NextResponse.json({ error: "Failed to withdraw application." }, { status: 500 });
      }

      // Insert status history
      await fetch(`${DIRECTUS_BASE}/items/vs_job_application_status_history`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          application_id: body.application_id,
          from_status: appData.application_status,
          to_status: "WITHDRAWN",
          actor: "Freelancer",
          actor_user_id: userId,
          public_reason: body.reason || null,
          occurred_at: nowPH,
        }),
      }).catch((e) => console.error("Error creating withdrawal history:", e));

      // Trigger notifications for employer
      try {
        let jobTitle = "Position";
        let companyId: number | null = null;
        const jobRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${appData.job_id}?fields=job_title,company_id`, {
          headers: getHeaders(),
          cache: "no-store",
        });
        if (jobRes.ok) {
          const jData = (await jobRes.json()).data;
          jobTitle = jData?.job_title || jobTitle;
          companyId = jData?.company_id ? Number(jData.company_id) : null;
        }

        const userRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}?fields=user_fname,user_lname`, {
          headers: getHeaders(),
          cache: "no-store",
        });
        let candidateName = "Candidate";
        if (userRes.ok) {
          const u = (await userRes.json()).data;
          candidateName = `${u?.user_fname ?? ""} ${u?.user_lname ?? ""}`.trim() || candidateName;
        }

        // 1. In-app notification for Freelancer
        await createNotification({
          event_type: "application_status_updated",
          recipient_user_id: userId,
          entity_type: "job_application",
          entity_id: Number(body.application_id),
          category: "Application Updates",
          title: "Application Withdrawn",
          message: `You have successfully withdrawn your application for "${jobTitle}".`,
          action_url: "/vos-sync/freelancer/applications",
        }).catch((e) => console.error("Error creating candidate withdrawal notification:", e));

        // 2. In-app notification for Employer/Company recruiter
        if (companyId) {
          const compUserRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_user?filter[company_id][_eq]=${companyId}&fields=user_id&limit=1`, { headers: getHeaders(), cache: "no-store" });
          if (compUserRes.ok) {
            const cuData = (await compUserRes.json()).data;
            const employerUserId = cuData?.[0]?.user_id ? Number(cuData[0].user_id) : null;
            if (employerUserId) {
              await createEmployerNotification({
                event_type: "APPLICATION_STATUS_UPDATED",
                recipient_user_id: employerUserId,
                entity_type: "job_application",
                entity_id: body.application_id,
                category: "APPLICATION_STATUS_UPDATED",
                title: "Application Withdrawn",
                message: `${candidateName} has withdrawn their application for "${jobTitle}".`,
                action_url: `/vos-sync/client/applicants/${body.application_id}`,
              }).catch((e) => console.error("Error creating employer withdrawal notification:", e));
            }
          }
        }
      } catch (err) {
        console.error("Error notifying about withdrawal:", err);
      }

      return NextResponse.json({ success: true, message: "Application withdrawn successfully." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: unknown) {
    console.error("PATCH /api/freelancer/applications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
