// src/modules/vos-admin/user-management/services/user.repo.ts
import { VsUser, IdentityVerification } from '../types/user.types';

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

export async function fetchUsersRepo(
  roleId?: number,
  search?: string,
  page: number = 1,
  limit: number = 10
): Promise<{ users: VsUser[]; total: number }> {
  const queries: string[] = [];

  // Pagination parameters
  queries.push(`limit=${limit}`);
  queries.push(`page=${page}`);
  queries.push('meta=filter_count');
  queries.push('sort=-user_id');

  // Filter conditions
  const filterParams: string[] = [];

  // Filter by role_id
  if (roleId && roleId !== 0) {
    filterParams.push(`"role_id":{"_eq":${roleId}}`);
  }

  // Filter by search query (first name, last name, or email)
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
    throw new Error(`Failed to fetch users from database: ${res.statusText}`);
  }

  const json = await res.json();
  const users = json.data || [];
  const total = json.meta?.filter_count ?? users.length;

  // Let's also fetch verification status summaries for these users to display in the table
  const userIds = users.map((u: VsUser) => u.user_id);
  let verificationsMap: Record<number, IdentityVerification[]> = {};

  if (userIds.length > 0) {
    const verifUrl = `${DIRECTUS_BASE}/items/vs_identity_verifications?filter[user_id][_in]=${userIds.join(',')}&limit=-1`;
    const verifRes = await fetch(verifUrl, { headers: getHeaders(), cache: "no-store" });
    if (verifRes.ok) {
      const verifJson = await verifRes.json();
      const allVerifs = verifJson.data || [];
      allVerifs.forEach((v: IdentityVerification) => {
        if (!verificationsMap[v.user_id]) {
          verificationsMap[v.user_id] = [];
        }
        verificationsMap[v.user_id].push(v);
      });
    }
  }

  const usersWithVerif = users.map((user: VsUser) => ({
    ...user,
    verifications: verificationsMap[user.user_id] || []
  }));

  return {
    users: usersWithVerif,
    total
  };
}

export async function fetchUserDetailRepo(userId: number): Promise<VsUser | null> {
  const url = `${DIRECTUS_BASE}/items/vs_user/${userId}`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch user detail: ${res.statusText}`);
  }

  const json = await res.json();
  const user = json.data;
  if (!user) return null;

  // Fetch verifications for this specific user
  const verifUrl = `${DIRECTUS_BASE}/items/vs_identity_verifications?filter[user_id][_eq]=${userId}&sort=-submitted_at&limit=-1`;
  const verifRes = await fetch(verifUrl, { headers: getHeaders(), cache: "no-store" });
  let verifications: IdentityVerification[] = [];
  if (verifRes.ok) {
    const verifJson = await verifRes.json();
    verifications = verifJson.data || [];
  }

  return {
    ...user,
    verifications
  };
}

export async function updateIdentityVerificationStatusRepo(
  verificationId: number,
  status: 'approved' | 'rejected',
  adminId: number,
  rejectionNote?: string
): Promise<IdentityVerification> {
  const url = `${DIRECTUS_BASE}/items/vs_identity_verifications/${verificationId}`;
  
  const payload: Partial<IdentityVerification> = {
    status,
    reviewed_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "), // PH Time
    reviewed_by: adminId,
    rejection_note: status === 'rejected' ? (rejectionNote || 'Rejected by Administrator') : null
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update verification status: ${errorText}`);
  }

  const json = await res.json();
  return json.data;
}
