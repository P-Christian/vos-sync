// src/modules/vos-admin/audit-trail/services/audit.repo.ts
import { AuditRecord, AuditFilters, AuditKPIData } from '../types/audit.types';

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

  // Resolve actor names via batch fetch on vs_user
  const actorUserIds = Array.from(
    new Set(
      rawRecords
        .map((r) => r.actor_user_id)
        .filter((id): id is number => id !== null && id !== undefined && id > 0)
    )
  );

  const userMap: Record<number, { name: string; email: string }> = {};

  if (actorUserIds.length > 0) {
    try {
      const userUrl = `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${actorUserIds.join(',')}&fields=user_id,user_fname,user_lname,user_email&limit=-1`;
      const userRes = await fetch(userUrl, { headers: getHeaders(), cache: "no-store" });
      if (userRes.ok) {
        const userJson = await userRes.json();
        const users = userJson.data || [];
        users.forEach((u: { user_id: number; user_fname: string; user_lname: string; user_email: string }) => {
          userMap[u.user_id] = {
            name: `${u.user_fname ?? ''} ${u.user_lname ?? ''}`.trim() || u.user_email || `User #${u.user_id}`,
            email: u.user_email || '',
          };
        });
      }
    } catch (err) {
      console.warn("Failed to batch resolve actor names for audit records:", err);
    }
  }

  const recordsWithActorInfo = rawRecords.map((record) => {
    let oldVals = record.old_values;
    let newVals = record.new_values;
    if (typeof oldVals === 'string') {
      try { oldVals = JSON.parse(oldVals); } catch { /* ignore */ }
    }
    if (typeof newVals === 'string') {
      try { newVals = JSON.parse(newVals); } catch { /* ignore */ }
    }

    const resolvedUser = record.actor_user_id ? userMap[record.actor_user_id] : null;

    return {
      ...record,
      old_values: oldVals,
      new_values: newVals,
      actor_name: resolvedUser ? resolvedUser.name : (record.actor_type === 'SYSTEM' ? 'System' : null),
      actor_email: resolvedUser ? resolvedUser.email : null,
    };
  });

  return {
    records: recordsWithActorInfo,
    total,
  };
}

export async function fetchAuditKPIsRepo(): Promise<AuditKPIData> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const [todayRes, failedRes, deniedRes, adminRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_audit_trail?filter[created_at][_gte]=${todayStr}&limit=0&meta=filter_count`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_audit_trail?filter[created_at][_gte]=${todayStr}&filter[status][_eq]=FAILED&limit=0&meta=filter_count`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_audit_trail?filter[created_at][_gte]=${todayStr}&filter[status][_eq]=DENIED&limit=0&meta=filter_count`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_audit_trail?filter[created_at][_gte]=${todayStr}&filter[actor_type][_eq]=ADMIN&limit=0&meta=filter_count`, { headers: getHeaders(), cache: "no-store" }),
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
