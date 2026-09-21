// src/modules/vos-admin/school-verification/services/schoolVerification.repo.ts
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

export async function fetchSchoolsRepo(status?: string, search?: string): Promise<Record<string, unknown>[]> {
  const filterParams: string[] = [];

  if (status && status.toUpperCase() !== "ALL") {
    filterParams.push(`"verification_status":{"_eq":"${status}"}`);
  }

  if (search && search.trim()) {
    const q = search.trim();
    filterParams.push(`"_or":[
      {"school_name":{"_icontains":"${q}"}},
      {"school_email":{"_icontains":"${q}"}},
      {"city_municipality":{"_icontains":"${q}"}},
      {"province":{"_icontains":"${q}"}},
      {"school_type":{"_icontains":"${q}"}}
    ]`);
  }

  const queries: string[] = ["sort=-created_at", "limit=-1"];
  if (filterParams.length > 0) {
    queries.push(`filter={${filterParams.join(",")}}`);
  }

  const url = `${DIRECTUS_BASE}/items/vs_school?${queries.join("&")}`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Directus vs_school fetch failed: ${res.statusText} (${errText})`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchSchoolDocumentsRepo(schoolIds: number[]): Promise<Record<string, unknown>[]> {
  if (schoolIds.length === 0) return [];
  const url = `${DIRECTUS_BASE}/items/vs_school_document?filter[school_id][_in]=${schoolIds.join(",")}&limit=-1`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchSchoolCoursesRepo(schoolIds: number[]): Promise<Record<string, unknown>[]> {
  if (schoolIds.length === 0) return [];
  const url = `${DIRECTUS_BASE}/items/vs_school_course?filter[school_id][_in]=${schoolIds.join(",")}&sort=-created_at&limit=-1`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchCoursesBySchoolRepo(schoolId: number): Promise<Record<string, unknown>[]> {
  const url = `${DIRECTUS_BASE}/items/vs_school_course?filter[school_id][_eq]=${schoolId}&sort=-created_at&limit=-1`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchSchoolAdminsRepo(
  schoolIds: number[],
  additionalUserIds: number[] = []
): Promise<{
  admins: Record<string, unknown>[];
  users: Record<string, unknown>[];
  identityVerifications: Record<string, unknown>[];
}> {
  if (schoolIds.length === 0) return { admins: [], users: [], identityVerifications: [] };

  const adminUrl = `${DIRECTUS_BASE}/items/vs_school_admin?filter[school_id][_in]=${schoolIds.join(",")}&limit=-1`;
  const adminRes = await fetch(adminUrl, { headers: getHeaders(), cache: "no-store" });
  const admins: Record<string, unknown>[] = adminRes.ok ? (await adminRes.json()).data || [] : [];

  const uids = Array.from(
    new Set(
      [
        ...admins.map((a) => {
          const raw = typeof a.user_id === "object" && a.user_id !== null ? (a.user_id as Record<string, unknown>).user_id : a.user_id;
          return Number(raw);
        }),
        ...additionalUserIds,
      ].filter(Boolean)
    )
  );

  let users: Record<string, unknown>[] = [];
  let identityVerifications: Record<string, unknown>[] = [];

  if (uids.length > 0) {
    const [uRes, idVerRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${uids.join(",")}&fields=*&limit=-1`, {
        headers: getHeaders(),
        cache: "no-store",
      }),
      fetch(`${DIRECTUS_BASE}/items/vs_identity_verifications?filter[user_id][_in]=${uids.join(",")}&limit=-1`, {
        headers: getHeaders(),
        cache: "no-store",
      }),
    ]);

    if (uRes.ok) {
      users = (await uRes.json()).data || [];
    }
    if (idVerRes.ok) {
      identityVerifications = (await idVerRes.json()).data || [];
    }
  }

  return { admins, users, identityVerifications };
}

export async function patchSchoolRepo(schoolId: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = `${DIRECTUS_BASE}/items/vs_school/${schoolId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update vs_school: ${res.statusText} (${errText})`);
  }

  const json = await res.json();
  return json.data;
}

export async function patchUserRepo(userId: number, payload: Record<string, unknown>): Promise<void> {
  const url = `${DIRECTUS_BASE}/items/vs_user/${userId}`;
  await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function patchIdentityVerificationsRepo(userId: number, payload: Record<string, unknown>): Promise<void> {
  const findUrl = `${DIRECTUS_BASE}/items/vs_identity_verifications?filter[user_id][_eq]=${userId}&sort=-submitted_at&limit=1`;
  const res = await fetch(findUrl, { headers: getHeaders(), cache: "no-store" });
  if (res.ok) {
    const json = await res.json();
    const latest = json.data?.[0];
    if (latest && latest.id) {
      await fetch(`${DIRECTUS_BASE}/items/vs_identity_verifications/${latest.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
    }
  }
}

export async function createAuditTrailRepo(payload: Record<string, unknown>): Promise<void> {
  try {
    const url = `${DIRECTUS_BASE}/items/vs_audit_trail`;
    await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Could not write to vs_audit_trail:", err);
  }
}
