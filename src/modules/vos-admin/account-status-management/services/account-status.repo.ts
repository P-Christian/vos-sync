// src/modules/vos-admin/account-status-management/services/account-status.repo.ts
import { AccountStatusUser, AccountRestriction, AccountStatusHistory, AccountStatusCase, AccountDeletionRequest } from '../types/account-status.types';

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

export async function fetchAccountStatusUsersRepo(
  statusFilter?: string,
  search?: string,
  page: number = 1,
  limit: number = 10
): Promise<{ users: AccountStatusUser[]; total: number }> {
  const queries: string[] = [];

  queries.push(`limit=${limit}`);
  queries.push(`page=${page}`);
  queries.push('meta=filter_count');
  queries.push('sort=-user_id');

  const filterParams: string[] = [];

  if (statusFilter && statusFilter !== "ALL") {
    filterParams.push(`"status":{"_eq":"${statusFilter}"}`);
  }

  if (search && search.trim()) {
    const cleanSearch = search.trim();
    filterParams.push(`"_or":[
      {"user_fname":{"_icontains":"${cleanSearch}"}},
      {"user_lname":{"_icontains":"${cleanSearch}"}},
      {"user_email":{"_icontains":"${cleanSearch}"}}
    ]`);
  }

  if (filterParams.length > 0) {
    queries.push(`filter={${filterParams.join(',')}}`);
  }

  const queryString = queries.length > 0 ? `?${queries.join('&')}` : '';
  const url = `${DIRECTUS_BASE}/items/vs_user${queryString}`;

  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch users: ${res.statusText}`);
  }

  const json = await res.json();
  const rawUsers = json.data || [];
  const total = json.meta?.filter_count ?? rawUsers.length;

  const userIds = rawUsers.map((u: any) => u.user_id);
  const restrictionsMap: Record<number, AccountRestriction[]> = {};
  const casesMap: Record<number, AccountStatusCase[]> = {};
  const deletionsMap: Record<number, AccountDeletionRequest> = {};

  if (userIds.length > 0) {
    const idsCsv = userIds.join(',');

    // Fetch restrictions
    const restUrl = `${DIRECTUS_BASE}/items/vs_account_restriction?filter[user_id][_in]=${idsCsv}&filter[status][_eq]=ACTIVE&limit=-1`;
    const restRes = await fetch(restUrl, { headers: getHeaders(), cache: "no-store" });
    if (restRes.ok) {
      const restJson = await restRes.json();
      (restJson.data || []).forEach((r: AccountRestriction) => {
        if (!restrictionsMap[r.user_id]) restrictionsMap[r.user_id] = [];
        restrictionsMap[r.user_id].push(r);
      });
    }

    // Fetch appeal cases
    const casesUrl = `${DIRECTUS_BASE}/items/vs_account_status_case?filter[user_id][_in]=${idsCsv}&limit=-1`;
    const casesRes = await fetch(casesUrl, { headers: getHeaders(), cache: "no-store" });
    if (casesRes.ok) {
      const casesJson = await casesRes.json();
      (casesJson.data || []).forEach((c: AccountStatusCase) => {
        if (!casesMap[c.user_id]) casesMap[c.user_id] = [];
        casesMap[c.user_id].push(c);
      });
    }

    // Fetch deletion requests
    const delUrl = `${DIRECTUS_BASE}/items/vs_account_deletion_request?filter[user_id][_in]=${idsCsv}&filter[completed_at][_null]=true&limit=-1`;
    const delRes = await fetch(delUrl, { headers: getHeaders(), cache: "no-store" });
    if (delRes.ok) {
      const delJson = await delRes.json();
      (delJson.data || []).forEach((d: AccountDeletionRequest) => {
        deletionsMap[d.user_id] = d;
      });
    }
  }

  const users: AccountStatusUser[] = rawUsers.map((u: any) => ({
    user_id: u.user_id,
    user_email: u.user_email,
    user_fname: u.user_fname,
    user_lname: u.user_lname,
    role: u.role || 'USER',
    role_id: u.role_id,
    status: u.status || 'ACTIVE',
    status_version: u.status_version || 1,
    session_epoch: u.session_epoch,
    restrictions: restrictionsMap[u.user_id] || [],
    cases: casesMap[u.user_id] || [],
    deletionRequest: deletionsMap[u.user_id] || null
  }));

  return { users, total };
}

export async function fetchUserStatusDetailRepo(userId: number): Promise<AccountStatusUser | null> {
  const url = `${DIRECTUS_BASE}/items/vs_user/${userId}`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch user status details: ${res.statusText}`);
  }

  const json = await res.json();
  const u = json.data;
  if (!u) return null;

  // Fetch restrictions
  const restUrl = `${DIRECTUS_BASE}/items/vs_account_restriction?filter[user_id][_eq]=${userId}&limit=-1`;
  const restRes = await fetch(restUrl, { headers: getHeaders(), cache: "no-store" });
  const restrictions = restRes.ok ? (await restRes.json()).data || [] : [];

  // Fetch history
  const histUrl = `${DIRECTUS_BASE}/items/vs_account_status_history?filter[user_id][_eq]=${userId}&sort=-occurred_at&limit=50`;
  const histRes = await fetch(histUrl, { headers: getHeaders(), cache: "no-store" });
  const history = histRes.ok ? (await histRes.json()).data || [] : [];

  // Fetch appeal cases
  const casesUrl = `${DIRECTUS_BASE}/items/vs_account_status_case?filter[user_id][_eq]=${userId}&sort=-created_at&limit=-1`;
  const casesRes = await fetch(casesUrl, { headers: getHeaders(), cache: "no-store" });
  const cases = casesRes.ok ? (await casesRes.json()).data || [] : [];

  // Fetch deletion requests
  const delUrl = `${DIRECTUS_BASE}/items/vs_account_deletion_request?filter[user_id][_eq]=${userId}&sort=-requested_at&limit=1`;
  const delRes = await fetch(delUrl, { headers: getHeaders(), cache: "no-store" });
  const delData = delRes.ok ? (await delRes.json()).data || [] : [];
  const deletionRequest = delData.length > 0 ? delData[0] : null;

  return {
    user_id: u.user_id,
    user_email: u.user_email,
    user_fname: u.user_fname,
    user_lname: u.user_lname,
    role: u.role || 'USER',
    role_id: u.role_id,
    status: u.status || 'ACTIVE',
    status_version: u.status_version || 1,
    session_epoch: u.session_epoch,
    restrictions,
    cases,
    history,
    deletionRequest
  };
}

export async function updateUserStatusRepo(
  userId: number,
  newStatus: string,
  newVersion: number,
  adminEmail: string,
  reasonCode: string,
  publicReason: string,
  internalNote?: string,
  expiresAt?: string | null,
  restrictionsToApply?: string[]
): Promise<boolean> {
  // Update vs_user status
  const userUrl = `${DIRECTUS_BASE}/items/vs_user/${userId}`;
  const userPayload = {
    status: newStatus,
    status_version: newVersion,
    session_epoch: newStatus !== 'ACTIVE' && newStatus !== 'LIMITED' ? new Date().toISOString() : undefined
  };

  const userRes = await fetch(userUrl, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(userPayload)
  });

  if (!userRes.ok) {
    throw new Error(`Failed to update user status record: ${await userRes.text()}`);
  }

  // Create history record
  const histUrl = `${DIRECTUS_BASE}/items/vs_account_status_history`;
  const histPayload = {
    user_id: userId,
    prior_status: null, // Can be resolved dynamically if needed
    new_status: newStatus,
    prior_version: newVersion - 1,
    new_version: newVersion,
    actor: adminEmail,
    approver: adminEmail,
    reason: internalNote || reasonCode,
    occurred_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ") // PH Time
  };

  await fetch(histUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(histPayload)
  });

  // Handle active restrictions if status is LIMITED
  if (newStatus === 'LIMITED' && restrictionsToApply && restrictionsToApply.length > 0) {
    const restUrl = `${DIRECTUS_BASE}/items/vs_account_restriction`;
    for (const code of restrictionsToApply) {
      const restPayload = {
        user_id: userId,
        code,
        status: 'ACTIVE',
        effective_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "),
        expires_at: expiresAt ? expiresAt.slice(0, 19).replace("T", " ") : null,
        reason: publicReason,
        source: adminEmail
      };

      await fetch(restUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(restPayload)
      });
    }
  }

  return true;
}

export async function updateAppealCaseRepo(
  caseId: number,
  userId: number,
  decision: 'uphold' | 'modify' | 'restore',
  adminEmail: string,
  internalNote?: string,
  publicNote?: string
): Promise<boolean> {
  const caseUrl = `${DIRECTUS_BASE}/items/vs_account_status_case/${caseId}`;
  const casePayload = {
    state: 'RESOLVED',
    internal_decision: internalNote,
    public_decision: publicNote || `Appeal ${decision}ed by administration.`,
    resolved_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ")
  };

  const caseRes = await fetch(caseUrl, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(casePayload)
  });

  if (!caseRes.ok) {
    throw new Error(`Failed to update case record: ${await caseRes.text()}`);
  }

  // If restoring, set status to ACTIVE
  if (decision === 'restore') {
    // Fetch user details first to get current version
    const userDetail = await fetchUserStatusDetailRepo(userId);
    if (userDetail) {
      await updateUserStatusRepo(
        userId,
        'ACTIVE',
        userDetail.status_version + 1,
        adminEmail,
        'APPEAL_RESTORED',
        'Your appeal has been accepted and your account access is restored.',
        internalNote
      );

      // Mark user restrictions as INACTIVE
      const restUrl = `${DIRECTUS_BASE}/items/vs_account_restriction?filter[user_id][_eq]=${userId}&filter[status][_eq]=ACTIVE&limit=-1`;
      const restRes = await fetch(restUrl, { headers: getHeaders(), cache: "no-store" });
      if (restRes.ok) {
        const restrictions = (await restRes.json()).data || [];
        for (const r of restrictions) {
          await fetch(`${DIRECTUS_BASE}/items/vs_account_restriction/${r.restriction_id}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status: 'INACTIVE' })
          });
        }
      }
    }
  }

  return true;
}
