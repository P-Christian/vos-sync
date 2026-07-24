import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

function getDirectusHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

async function getAdminUserFromToken(req: NextRequest): Promise<{ adminId: number } | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return { adminId: 1 };
  }
  const cookieStore = await cookies();
  const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = Number(payload.sub || payload.user_id || payload.id || 1);
    return { adminId };
  } catch {
    return { adminId: 1 };
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json(
        { error: "Unauthorized: no token provided" },
        { status: 401 }
      );
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus API base URL is not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    /**
     * Build Directus filter query for vs_company
     */
    const filterParams: string[] = [];

    if (status && status.toUpperCase() !== "ALL") {
      filterParams.push(`"verification_status":{"_eq":"${status}"}`);
    }

    if (search && search.trim()) {
      const q = search.trim();
      filterParams.push(`"_or":[
        {"company_name":{"_icontains":"${q}"}},
        {"company_legal_name":{"_icontains":"${q}"}},
        {"company_code":{"_icontains":"${q}"}},
        {"company_tin":{"_icontains":"${q}"}},
        {"registration_no":{"_icontains":"${q}"}},
        {"company_email":{"_icontains":"${q}"}}
      ]`);
    }

    const queries: string[] = ["sort=-created_at", "limit=-1"];
    if (filterParams.length > 0) {
      queries.push(`filter={${filterParams.join(",")}}`);
    }

    const companyUrl = `${DIRECTUS_BASE}/items/vs_company?${queries.join("&")}`;
    const res = await fetch(companyUrl, {
      headers: getDirectusHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Directus fetch failed: ${res.statusText} (${errText})` },
        { status: res.status }
      );
    }

    const json = await res.json();
    const companies: Record<string, unknown>[] = json.data || [];

    if (companies.length === 0) {
      return NextResponse.json([]);
    }

    const companyIds = companies.map((c) => Number(c.company_id)).filter(Boolean);

    /**
     * Batch fetch related documents from vs_company_document
     */
    let docMap: Record<number, unknown[]> = {};
    if (companyIds.length > 0) {
      try {
        const docUrl = `${DIRECTUS_BASE}/items/vs_company_document?filter[company_id][_in]=${companyIds.join(",")}&limit=-1`;
        const docRes = await fetch(docUrl, { headers: getDirectusHeaders(), cache: "no-store" });
        if (docRes.ok) {
          const docJson = await docRes.json();
          const docs: Record<string, unknown>[] = docJson.data || [];
          docs.forEach((d) => {
            const cid = Number(d.company_id);
            if (!docMap[cid]) docMap[cid] = [];
            docMap[cid].push(d);
          });
        }
      } catch (err) {
        console.warn("Failed to fetch vs_company_document records:", err);
      }
    }

    /**
     * Batch fetch primary contacts / users from vs_company_user
     */
    let userMap: Record<number, unknown[]> = {};
    if (companyIds.length > 0) {
      try {
        const companyUserUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[company_id][_in]=${companyIds.join(",")}&limit=-1`;
        const cuRes = await fetch(companyUserUrl, { headers: getDirectusHeaders(), cache: "no-store" });
        if (cuRes.ok) {
          const cuJson = await cuRes.json();
          const cus: Record<string, unknown>[] = cuJson.data || [];
          
          // Get unique user IDs to resolve names/emails
          const uids = Array.from(new Set(cus.map((cu) => Number(cu.user_id)).filter(Boolean)));
          let vsUserMap: Record<number, { user_fname?: string; user_lname?: string; user_email?: string }> = {};

          if (uids.length > 0) {
            const vsUserUrl = `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${uids.join(",")}&fields=user_id,user_fname,user_lname,user_email&limit=-1`;
            const uRes = await fetch(vsUserUrl, { headers: getDirectusHeaders(), cache: "no-store" });
            if (uRes.ok) {
              const uJson = await uRes.json();
              const uList = uJson.data || [];
              uList.forEach((u: { user_id: number; user_fname?: string; user_lname?: string; user_email?: string }) => {
                vsUserMap[u.user_id] = u;
              });
            }
          }

          cus.forEach((cu) => {
            const cid = Number(cu.company_id);
            const uid = Number(cu.user_id);
            const uInfo = vsUserMap[uid] || {};
            if (!userMap[cid]) userMap[cid] = [];
            userMap[cid].push({
              ...cu,
              user_fname: uInfo.user_fname,
              user_lname: uInfo.user_lname,
              user_email: uInfo.user_email,
            });
          });
        }
      } catch (err) {
        console.warn("Failed to fetch vs_company_user records:", err);
      }
    }

    /**
     * Batch fetch verification attempts from vs_company_verifications
     */
    let verifMap: Record<number, unknown[]> = {};
    if (companyIds.length > 0) {
      try {
        const verifUrl = `${DIRECTUS_BASE}/items/vs_company_verifications?filter[company_id][_in]=${companyIds.join(",")}&sort=-created_at&limit=-1`;
        const verifRes = await fetch(verifUrl, { headers: getDirectusHeaders(), cache: "no-store" });
        if (verifRes.ok) {
          const verifJson = await verifRes.json();
          const verifs: Record<string, unknown>[] = verifJson.data || [];

          // Collect user IDs for reviewer and submitter
          const verifUserIds = Array.from(
            new Set(
              verifs
                .flatMap((v) => [Number(v.reviewed_by), Number(v.submitted_by_user_id)])
                .filter((id): id is number => Boolean(id) && id > 0)
            )
          );

          let verifUserNames: Record<number, string> = {};
          if (verifUserIds.length > 0) {
            const vUserUrl = `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${verifUserIds.join(",")}&fields=user_id,user_fname,user_lname,user_email&limit=-1`;
            const vUserRes = await fetch(vUserUrl, { headers: getDirectusHeaders(), cache: "no-store" });
            if (vUserRes.ok) {
              const vUserJson = await vUserRes.json();
              const vUserList = vUserJson.data || [];
              vUserList.forEach((u: { user_id: number; user_fname?: string; user_lname?: string; user_email?: string }) => {
                const name = `${u.user_fname ?? ""} ${u.user_lname ?? ""}`.trim() || u.user_email || `User #${u.user_id}`;
                verifUserNames[u.user_id] = name;
              });
            }
          }

          verifs.forEach((v) => {
            const cid = Number(v.company_id);
            const rId = Number(v.reviewed_by);
            const sId = Number(v.submitted_by_user_id);
            if (!verifMap[cid]) verifMap[cid] = [];
            verifMap[cid].push({
              ...v,
              reviewer_name: rId ? verifUserNames[rId] || `Admin #${rId}` : null,
              submitter_name: sId ? verifUserNames[sId] || `User #${sId}` : null,
            });
          });
        }
      } catch (err) {
        console.warn("Failed to fetch vs_company_verifications records:", err);
      }
    }

    /**
     * Combine records with documents, users, and verifications
     */
    const records = companies.map((c) => {
      const cid = Number(c.company_id);
      const companyVerifs = (verifMap[cid] || []) as Record<string, unknown>[];
      const latestVerif = companyVerifs.length > 0 ? companyVerifs[0] : null;

      return {
        ...c,
        documents: docMap[cid] || [],
        users: userMap[cid] || [],
        verifications: companyVerifs,
        latest_verification: latestVerif,
        internal_notes: (latestVerif?.internal_notes as string) || (c.internal_notes as string) || null,
        rejection_reason: (latestVerif?.public_rejection_reason as string) || (c.rejection_reason as string) || null,
        submitted_at: (latestVerif?.submitted_at as string) || (c.submitted_at as string) || (c.created_at as string),
      };
    });

    return NextResponse.json(records);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("API Route Error (company-verification):", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAdminUserFromToken(req);
    const adminId = auth?.adminId || 1;

    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus API base URL is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { companyId, action, rejectionReason, internalNotes } = body;

    if (!companyId || !action) {
      return NextResponse.json(
        { error: "companyId and action are required" },
        { status: 400 }
      );
    }

    let verifStatus = "PENDING_VERIFICATION";
    let companyStatus: string | null = null;
    let isPublic = 0;

    if (action === "approve") {
      companyStatus = "VERIFIED";
      verifStatus = "APPROVED";
      isPublic = 1;
    } else if (action === "reject") {
      companyStatus = "REJECTED";
      verifStatus = "REJECTED";
    } else if (action === "suspend") {
      companyStatus = "SUSPENDED";
      verifStatus = "SUSPENDED";
    } else if (action === "request_correction") {
      companyStatus = "PENDING_VERIFICATION";
      verifStatus = "CORRECTION_REQUIRED";
    } else if (action === "start_review" || action === "in_review") {
      companyStatus = "PENDING_VERIFICATION";
      verifStatus = "IN_REVIEW";
    }

    const patchPayload: Record<string, unknown> = {
      rejection_reason: rejectionReason || null,
      updated_by_user_id: adminId,
      updated_at: new Date().toISOString(),
    };

    if (companyStatus) {
      patchPayload.verification_status = companyStatus;
    }

    if (action === "approve") {
      patchPayload.is_public = isPublic;
      patchPayload.verified_at = new Date().toISOString();
      patchPayload.verified_by_user_id = adminId;
    }

    // 1. Update vs_company in Directus
    const companyPatchUrl = `${DIRECTUS_BASE}/items/vs_company/${companyId}`;
    const patchRes = await fetch(companyPatchUrl, {
      method: "PATCH",
      headers: getDirectusHeaders(),
      body: JSON.stringify(patchPayload),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return NextResponse.json(
        { error: `Failed to update vs_company: ${patchRes.statusText} (${errText})` },
        { status: patchRes.status }
      );
    }

    // 2. Log verification entry into vs_company_verifications
    try {
      const verifLogUrl = `${DIRECTUS_BASE}/items/vs_company_verifications`;
      await fetch(verifLogUrl, {
        method: "POST",
        headers: getDirectusHeaders(),
        body: JSON.stringify({
          company_id: companyId,
          submitted_by_user_id: null,
          verification_type: "INITIAL_REGISTRATION",
          status: verifStatus,
          submitted_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
          public_rejection_reason: rejectionReason || null,
          internal_notes: internalNotes || null,
        }),
      });
    } catch (verifErr) {
      console.warn("Could not write to vs_company_verifications table:", verifErr);
    }

    // 3. Log event into vs_audit_trail
    try {
      const auditUrl = `${DIRECTUS_BASE}/items/vs_audit_trail`;
      await fetch(auditUrl, {
        method: "POST",
        headers: getDirectusHeaders(),
        body: JSON.stringify({
          event_category: "VERIFICATION",
          event_type: `COMPANY_VERIFICATION_${action.toUpperCase()}`,
          action: action.toUpperCase(),
          status: "SUCCESS",
          actor_type: "ADMIN",
          actor_user_id: adminId,
          resource_type: "COMPANY",
          resource_id: String(companyId),
          reason: rejectionReason || `Company verification state updated to ${companyStatus}`,
          created_at: new Date().toISOString(),
        }),
      });
    } catch (auditErr) {
      console.warn("Could not write to vs_audit_trail:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Company ID ${companyId} status updated to ${companyStatus}`,
      verification_status: companyStatus,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("API Route Error (POST company-verification):", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
