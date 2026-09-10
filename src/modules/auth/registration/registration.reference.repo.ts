import { RegistrationError } from "./registration.errors";

interface DirectusListResponse<T> {
  data?: T[];
}

interface CompanySizeRecord {
  company_size_id: string | number;
  company_size_name: string;
}

interface IndustryRecord {
  industry_id: string | number;
  industry_name: string;
}

interface InvitationRecord {
  invited_email: string;
  is_used: boolean;
  expires_at: string;
  school_id:
    | string
    | number
    | { school_id: string | number; school_name?: string };
}

function getDirectusReadConfig(): {
  baseUrl: string;
  headers: Record<string, string>;
} {
  const baseUrl = (
    process.env.DIRECTUS_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    ""
  ).replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN?.trim();

  if (!baseUrl || !token) {
    throw new RegistrationError(
      "Registration reference data is not configured.",
      "CONFIGURATION_ERROR",
      503
    );
  }

  return {
    baseUrl,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
}

async function fetchDirectusList<T>(
  path: string,
  options: Pick<RequestInit, "cache"> & { next?: { revalidate: number } }
): Promise<T[]> {
  const { baseUrl, headers } = getDirectusReadConfig();
  const response = await fetch(`${baseUrl}${path}`, { headers, ...options });
  if (!response.ok) {
    throw new RegistrationError(
      "Registration reference data is temporarily unavailable.",
      "CONFIGURATION_ERROR",
      503
    );
  }
  const body = (await response.json()) as DirectusListResponse<T>;
  return Array.isArray(body.data) ? body.data : [];
}

export async function getRegistrationMetadata() {
  const [companySizes, industries] = await Promise.all([
    fetchDirectusList<CompanySizeRecord>(
      "/items/vs_company_size?filter[is_active][_eq]=true&fields=company_size_id,company_size_name&limit=100&sort=company_size_name",
      { cache: "force-cache", next: { revalidate: 300 } }
    ),
    fetchDirectusList<IndustryRecord>(
      "/items/vs_industry?filter[is_active][_eq]=true&fields=industry_id,industry_name&limit=100&sort=industry_name",
      { cache: "force-cache", next: { revalidate: 300 } }
    ),
  ]);

  return {
    companySizes: companySizes.map((item) => ({
      id: item.company_size_id,
      name: item.company_size_name,
    })),
    industries: industries.map((item) => ({
      id: item.industry_id,
      name: item.industry_name,
    })),
  };
}

export async function getSchoolInvitation(token: string) {
  const query = new URLSearchParams({
    "filter[token][_eq]": token,
    fields:
      "invited_email,is_used,expires_at,school_id.school_id,school_id.school_name",
    limit: "1",
  });
  const invitations = await fetchDirectusList<InvitationRecord>(
    `/items/vs_invite_token?${query.toString()}`,
    { cache: "no-store" }
  );
  return invitations[0] ?? null;
}
