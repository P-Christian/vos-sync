// src/modules/vos-admin/audit-trail/services/audit.repo.ts
import { AuditRecord, AuditFilters, AuditKPIData, AuditCategoryConfig, DEFAULT_AUDIT_CONFIG } from '../types/audit.types';

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

// Memory cache for audit config to avoid HTTP overhead on every audit log write
let cachedAuditConfig: AuditCategoryConfig | null = null;
let lastConfigFetchTime = 0;
const CONFIG_CACHE_TTL_MS = 30 * 1000; // 30 seconds

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function fetchAuditLogsRepo(
  filters: AuditFilters
): Promise<{ records: AuditRecord[]; total: number }> {
  const queries: string[] = [];

  // Pagination
  if (filters.limit > 0) {
    queries.push(`limit=${filters.limit}`);
    queries.push(`page=${filters.page}`);
  } else {
    queries.push('limit=-1');
  }
  queries.push('meta=filter_count');
  queries.push('sort=-created_at');

  // Build filter array for Directus
  const filterParams: string[] = [];

  if (filters.event_category && filters.event_category !== "ALL") {
    filterParams.push(`"event_category":{"_eq":"${filters.event_category}"}`);
  }

  if (filters.action && filters.action !== "ALL") {
    filterParams.push(`"action":{"_eq":"${filters.action}"}`);
  }

  if (filters.status && filters.status !== "ALL") {
    filterParams.push(`"status":{"_eq":"${filters.status}"}`);
  }

  if (filters.actor_type && filters.actor_type !== "ALL") {
    filterParams.push(`"actor_type":{"_eq":"${filters.actor_type}"}`);
  }

  if (filters.organization_type && filters.organization_type !== "ALL") {
    filterParams.push(`"organization_type":{"_eq":"${filters.organization_type}"}`);
  }

  if (filters.resource_type && filters.resource_type.trim()) {
    filterParams.push(`"resource_type":{"_icontains":"${filters.resource_type.trim()}"}`);
  }

  if (filters.actor_user_id) {
    filterParams.push(`"actor_user_id":{"_eq":${filters.actor_user_id}}`);
  }

  if (filters.date_from) {
    filterParams.push(`"created_at":{"_gte":"${filters.date_from}"}`);
  }

  if (filters.date_to) {
    filterParams.push(`"created_at":{"_lte":"${filters.date_to}T23:59:59"}`);
  }

  if (filters.search && filters.search.trim()) {
    const cleanSearch = filters.search.trim();
    filterParams.push(`"_or":[
      {"event_type":{"_icontains":"${cleanSearch}"}},
      {"reason":{"_icontains":"${cleanSearch}"}},
      {"resource_id":{"_icontains":"${cleanSearch}"}},
      {"resource_type":{"_icontains":"${cleanSearch}"}},
      {"correlation_id":{"_icontains":"${cleanSearch}"}}
    ]`);
  }

  if (filterParams.length > 0) {
    queries.push(`filter={${filterParams.join(',')}}`);
  }

  const queryString = queries.length > 0 ? `?${queries.join('&')}` : '';
  const url = `${DIRECTUS_BASE}/items/vs_audit_trail${queryString}`;

  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit records: ${res.statusText}`);
  }

  const json = await res.json();
  const rawRecords: AuditRecord[] = json.data || [];
  const total = json.meta?.filter_count ?? rawRecords.length;

  // Resolve actor and resource user IDs via batch fetch on vs_user
  const actorUserIds = Array.from(
    new Set(
      rawRecords
        .map((r) => r.actor_user_id)
        .filter((id): id is number => id !== null && id !== undefined && id > 0)
    )
  );

  const resourceUserIds = rawRecords
    .filter((r) => r.resource_type?.toUpperCase() === "USER" && r.resource_id)
    .map((r) => parseInt(String(r.resource_id), 10))
    .filter((id) => !isNaN(id) && id > 0);

  const allUserIds = Array.from(new Set([...actorUserIds, ...resourceUserIds]));

  // Resolve company IDs from actor_company_id, resource_id, and organization_id
  const companyIds = Array.from(
    new Set(
      rawRecords
        .flatMap((r) => {
          const ids: number[] = [];
          if (r.actor_company_id) ids.push(Number(r.actor_company_id));
          const isCompanyRelated =
            r.resource_type?.toUpperCase() === "COMPANY" ||
            r.event_category?.toUpperCase() === "COMPANY" ||
            r.event_category?.toUpperCase() === "VERIFICATION" ||
            (r.event_type || "").toUpperCase().includes("COMPANY") ||
            r.organization_type?.toUpperCase() === "EMPLOYER";

          if (isCompanyRelated && r.resource_id) {
            const num = parseInt(String(r.resource_id), 10);
            if (!isNaN(num) && num > 0) ids.push(num);
          }
          if (r.organization_id && (isCompanyRelated || r.organization_type === "EMPLOYER")) {
            const orgNum = parseInt(String(r.organization_id), 10);
            if (!isNaN(orgNum) && orgNum > 0) ids.push(orgNum);
          }
          return ids;
        })
        .filter((id) => !isNaN(id) && id > 0)
    )
  );

  // Resolve job IDs
  const jobIds = Array.from(
    new Set(
      rawRecords
        .filter((r) => r.resource_type?.toUpperCase() === "JOB" && r.resource_id)
        .map((r) => parseInt(String(r.resource_id), 10))
        .filter((id) => !isNaN(id) && id > 0)
    )
  );

  const userMap: Record<number, { name: string; email: string }> = {};
  const companyMap: Record<number, string> = {};
  const jobMap: Record<number, string> = {};

  try {
    const promises: Promise<void>[] = [];

    if (allUserIds.length > 0) {
      promises.push(
        (async () => {
          const userUrl = `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${allUserIds.join(",")}&fields=user_id,user_fname,user_lname,user_email&limit=-1`;
          const userRes = await fetch(userUrl, { headers: getHeaders(), cache: "no-store" });
          if (userRes.ok) {
            const userJson = await userRes.json();
            const users = userJson.data || [];
            users.forEach((u: { user_id?: number; user_fname?: string; user_lname?: string; user_email?: string }) => {
              if (u.user_id) {
                const name = `${u.user_fname ?? ""} ${u.user_lname ?? ""}`.trim() || u.user_email || `User #${u.user_id}`;
                userMap[u.user_id] = { name, email: u.user_email || "" };
              }
            });
          }
        })()
      );
    }

    if (companyIds.length > 0) {
      promises.push(
        (async () => {
          const compUrl = `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${companyIds.join(",")}&fields=company_id,company_name&limit=-1`;
          const compRes = await fetch(compUrl, { headers: getHeaders(), cache: "no-store" });
          if (compRes.ok) {
            const compJson = await compRes.json();
            const companies = compJson.data || [];
            companies.forEach((c: { company_id?: number; company_name?: string }) => {
              if (c.company_id && c.company_name) {
                companyMap[c.company_id] = c.company_name;
              }
            });
          }
        })()
      );
    }

    if (jobIds.length > 0) {
      promises.push(
        (async () => {
          const jobUrl = `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title&limit=-1`;
          const jobRes = await fetch(jobUrl, { headers: getHeaders(), cache: "no-store" });
          if (jobRes.ok) {
            const jobJson = await jobRes.json();
            const jobs = jobJson.data || [];
            jobs.forEach((j: { job_id?: number; job_title?: string }) => {
              if (j.job_id) {
                jobMap[j.job_id] = j.job_title || `Job #${j.job_id}`;
              }
            });
          }
        })()
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (err) {
    console.warn("Failed to batch resolve actor & resource names for audit records:", err);
  }

  const recordsWithActorInfo = rawRecords.map((record) => {
    let oldVals = record.old_values;
    let newVals = record.new_values;
    if (typeof oldVals === "string") {
      try { oldVals = JSON.parse(oldVals); } catch { /* ignore */ }
    }
    if (typeof newVals === "string") {
      try { newVals = JSON.parse(newVals); } catch { /* ignore */ }
    }

    const resolvedUser = record.actor_user_id ? userMap[record.actor_user_id] : null;

    // Resolve resource friendly name
    let resourceName: string | null = null;
    const rType = (record.resource_type || "").toUpperCase();
    const rCat = (record.event_category || "").toUpperCase();
    const rId = record.resource_id ? parseInt(String(record.resource_id), 10) : null;
    const orgId = record.organization_id ? parseInt(String(record.organization_id), 10) : null;

    if (rId && companyMap[rId]) {
      resourceName = companyMap[rId];
    } else if (orgId && companyMap[orgId]) {
      resourceName = companyMap[orgId];
    } else if (record.actor_company_id && companyMap[Number(record.actor_company_id)]) {
      resourceName = companyMap[Number(record.actor_company_id)];
    } else if (rId && userMap[rId] && (rType === "USER" || rCat === "USER")) {
      resourceName = userMap[rId].name;
    } else if (rId && jobMap[rId] && (rType === "JOB" || rCat === "JOB")) {
      resourceName = jobMap[rId];
    }

    return {
      ...record,
      old_values: oldVals,
      new_values: newVals,
      actor_name: resolvedUser ? resolvedUser.name : (record.actor_type === "SYSTEM" ? "System" : null),
      actor_email: resolvedUser ? resolvedUser.email : null,
      resource_name: resourceName,
    };
  });

  return {
    records: recordsWithActorInfo,
    total,
  };
}

export async function fetchAuditKPIsRepo(): Promise<AuditKPIData> {
  const now = new Date();
  const phDateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const todayStr = phDateParts;

  try {
    const [todayRes, failedRes, deniedRes, adminRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_audit_trail?filter[created_at][_gte]=${todayStr}&limit=1&meta=filter_count`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_audit_trail?filter[created_at][_gte]=${todayStr}&filter[status][_eq]=FAILED&limit=1&meta=filter_count`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_audit_trail?filter[created_at][_gte]=${todayStr}&filter[status][_eq]=DENIED&limit=1&meta=filter_count`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_audit_trail?filter[created_at][_gte]=${todayStr}&filter[actor_type][_eq]=ADMIN&limit=1&meta=filter_count`, { headers: getHeaders(), cache: "no-store" }),
    ]);

    const todayJson = todayRes.ok ? await todayRes.json() : {};
    const failedJson = failedRes.ok ? await failedRes.json() : {};
    const deniedJson = deniedRes.ok ? await deniedRes.json() : {};
    const adminJson = adminRes.ok ? await adminRes.json() : {};

    return {
      todayEvents: todayJson.meta?.filter_count ?? 0,
      failedEvents: failedJson.meta?.filter_count ?? 0,
      deniedAccess: deniedJson.meta?.filter_count ?? 0,
      adminActions: adminJson.meta?.filter_count ?? 0,
    };
  } catch (err) {
    console.error("Failed to fetch audit KPIs:", err);
    return { todayEvents: 0, failedEvents: 0, deniedAccess: 0, adminActions: 0 };
  }
}

export async function fetchAuditConfigRepo(): Promise<AuditCategoryConfig> {
  const now = Date.now();
  if (cachedAuditConfig && now - lastConfigFetchTime < CONFIG_CACHE_TTL_MS) {
    return cachedAuditConfig;
  }

  try {
    if (!DIRECTUS_BASE) return DEFAULT_AUDIT_CONFIG;
    const url = `${DIRECTUS_BASE}/items/vs_audit_config?limit=-1`;
    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const rows: Array<{ audit_config_id: number; event_category: string; event_type: string; is_enabled: number | boolean }> = json.data || [];

      if (rows.length > 0) {
        const categories: Record<string, boolean> = { ...(DEFAULT_AUDIT_CONFIG.categories || {}) };
        const actions: Record<string, Record<string, boolean>> = { ...(DEFAULT_AUDIT_CONFIG.actions || {}) };

        rows.forEach((r) => {
          const cat = r.event_category;
          const act = r.event_type;
          const enabled = Boolean(r.is_enabled);

          if (act === '__CATEGORY__') {
            categories[cat] = enabled;
          } else {
            if (!actions[cat]) actions[cat] = {};
            actions[cat][act] = enabled;
          }
        });

        cachedAuditConfig = { categories, actions };
        lastConfigFetchTime = Date.now();
        return cachedAuditConfig;
      }
    }
  } catch (err) {
    console.warn("[fetchAuditConfigRepo] Fallback to default config:", err);
  }

  return cachedAuditConfig || DEFAULT_AUDIT_CONFIG;
}

export async function updateAuditConfigRepo(
  newConfig: AuditCategoryConfig,
  adminId?: number
): Promise<AuditCategoryConfig> {
  try {
    if (!DIRECTUS_BASE) return newConfig;
    const url = `${DIRECTUS_BASE}/items/vs_audit_config`;

    // Fetch existing configuration rows
    const checkRes = await fetch(`${url}?limit=-1`, { headers: getHeaders(), cache: "no-store" });
    const existingMap: Record<string, number> = {};

    if (checkRes.ok) {
      const json = await checkRes.json();
      const rows: Array<{ audit_config_id: number; event_category: string; event_type: string }> = json.data || [];
      rows.forEach((r) => {
        const key = `${r.event_category}::${r.event_type}`;
        existingMap[key] = r.audit_config_id;
      });
    }

    // Process actions
    const actionsMap = newConfig.actions || {};
    const categoriesMap = newConfig.categories || {};

    const promises: Promise<Response>[] = [];

    // Category master toggles
    Object.entries(categoriesMap).forEach(([catKey, isEnabled]) => {
      const dbKey = `${catKey}::__CATEGORY__`;
      const existingId = existingMap[dbKey];
      const payload = {
        event_category: catKey,
        event_type: '__CATEGORY__',
        is_enabled: isEnabled ? 1 : 0,
        updated_by: adminId || null,
        description: `Master switch for ${catKey}`,
      };

      if (existingId) {
        promises.push(
          fetch(`${url}/${existingId}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(payload),
          })
        );
      } else {
        promises.push(
          fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...payload, created_by: adminId || null }),
          })
        );
      }
    });

    // Individual action toggles
    Object.entries(actionsMap).forEach(([catKey, actMap]) => {
      Object.entries(actMap).forEach(([actKey, isEnabled]) => {
        const dbKey = `${catKey}::${actKey}`;
        const existingId = existingMap[dbKey];
        const payload = {
          event_category: catKey,
          event_type: actKey,
          is_enabled: isEnabled ? 1 : 0,
          updated_by: adminId || null,
          description: `${actKey} action in ${catKey}`,
        };

        if (existingId) {
          promises.push(
            fetch(`${url}/${existingId}`, {
              method: 'PATCH',
              headers: getHeaders(),
              body: JSON.stringify(payload),
            })
          );
        } else {
          promises.push(
            fetch(url, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify({ ...payload, created_by: adminId || null }),
            })
          );
        }
      });
    });

    await Promise.allSettled(promises);

    cachedAuditConfig = { ...newConfig };
    lastConfigFetchTime = Date.now();
    return cachedAuditConfig;
  } catch (err) {
    console.error("[updateAuditConfigRepo] Error updating audit config:", err);
  }

  cachedAuditConfig = { ...newConfig };
  lastConfigFetchTime = Date.now();
  return cachedAuditConfig;
}

export function getPHISOTimestamp(): string {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return dtf.format(now).replace(" ", "T") + "+08:00";
}

export async function createAuditRecordRepo(payload: Partial<AuditRecord>): Promise<void> {
  try {
    if (!DIRECTUS_BASE) return;

    // Check category and action toggle settings before inserting log
    if (payload.event_category) {
      const config = await fetchAuditConfigRepo();
      const cat = String(payload.event_category);
      const act = payload.action ? String(payload.action) : null;

      // 1. Check category master toggle
      if (config.categories && config.categories[cat] === false) {
        return;
      }

      // 2. Check individual action toggle
      if (act && config.actions && config.actions[cat] && config.actions[cat][act] === false) {
        return;
      }
    }

    const recordPayload = {
      ...payload,
      created_at: payload.created_at || getPHISOTimestamp(),
    };

    const url = `${DIRECTUS_BASE}/items/vs_audit_trail`;
    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(recordPayload),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[createAuditRecordRepo] Failed to insert audit log:", res.status, errText);
    }
  } catch (err) {
    console.error("[createAuditRecordRepo] Audit record emission error:", err);
  }
}

