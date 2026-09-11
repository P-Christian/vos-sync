import {
  AuthenticatedSession,
  isAdministratorSession,
  isClientSession,
  isFreelancerSession,
} from "@/lib/authenticated-session";

export type ProtectedAssetKind =
  | "CLIENT_DOCUMENT"
  | "FREELANCER_RESUME"
  | "FREELANCER_IDENTITY"
  | "UNKNOWN";

export interface AssetAuthorization {
  allowed: boolean;
  protected: boolean;
  notFound: boolean;
  kind: ProtectedAssetKind;
}

interface DirectusFile {
  id?: string;
  folder?: string | { id?: string; name?: string } | null;
}

interface CompanyDocument {
  company_id?: string | number | { company_id?: string | number } | null;
  directus_file_id?: string | null;
}

interface ResumeRecord {
  user_id?: string | number | { user_id?: string | number } | null;
  file_url?: string | null;
}

interface IdentityRecord {
  user_id?: string | number | { user_id?: string | number } | null;
}

interface DirectusCollectionResponse<T> {
  data?: T[];
}

const KNOWN_PROTECTED_FOLDER_IDS = [
  // Existing deployments use these folders; env values below take precedence
  // and are the required configuration for new environments.
  "e81cc874-8036-4655-8bbb-1524a194866b", // freelancer identity documents
  "c380f14b-75d1-4b61-b2b4-9a6e596f3162", // freelancer resumes
];

const PROTECTED_FOLDER_NAMES = new Set([
  "client_documents",
  "client_identity_documents",
  "freelancer_documents",
  "freelancer_identity_documents",
  "identity_documents",
  "resume_documents",
  "resumes",
  "protected_documents",
]);

function directusConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = (
    process.env.DIRECTUS_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || ""
  ).replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN?.trim() || "";
  return baseUrl && token ? { baseUrl, token } : null;
}

function headers(token: string): Record<string, string> {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

function sameId(left: unknown, right: unknown): boolean {
  return left !== null && left !== undefined && right !== null && right !== undefined && String(left) === String(right);
}

function nestedId(value: unknown, key: "company_id" | "user_id"): string | number | null {
  if (typeof value === "object" && value !== null) {
    const nested = (value as Record<string, unknown>)[key];
    return typeof nested === "string" || typeof nested === "number" ? nested : null;
  }
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function protectedFolderIds(): Set<string> {
  const configured = [
    process.env.DIRECTUS_PROTECTED_CLIENT_DOCUMENTS_FOLDER_ID,
    process.env.DIRECTUS_CLIENT_DOCUMENTS_FOLDER_ID,
    process.env.DIRECTUS_PROTECTED_FREELANCER_IDENTITY_FOLDER_ID,
    process.env.DIRECTUS_FREELANCER_IDENTITY_FOLDER_ID,
    process.env.DIRECTUS_PROTECTED_FREELANCER_RESUMES_FOLDER_ID,
    process.env.DIRECTUS_PROTECTED_RESUME_FOLDER_ID,
    process.env.DIRECTUS_RESUME_FOLDER_ID,
  ];
  return new Set(
    [...KNOWN_PROTECTED_FOLDER_IDS, ...configured]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim()),
  );
}

async function getJson<T>(
  baseUrl: string,
  token: string,
  path: string,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, status: response.status, data: null };
    return { ok: true, status: response.status, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: 502, data: null };
  }
}

async function fetchFileMetadata(
  baseUrl: string,
  token: string,
  fileId: string,
): Promise<{ file: DirectusFile | null; lookupFailed: boolean; notFound: boolean }> {
  const fields = encodeURIComponent("id,folder,folder.name");
  const result = await getJson<{ data?: DirectusFile }>(
    baseUrl,
    token,
    `/files/${encodeURIComponent(fileId)}?fields=${fields}`,
  );
  if (result.ok) return { file: result.data?.data ?? null, lookupFailed: false, notFound: false };
  return { file: null, lookupFailed: result.status !== 404, notFound: result.status === 404 };
}

async function resolveFolderName(
  baseUrl: string,
  token: string,
  folder: DirectusFile["folder"],
): Promise<{ id: string | null; name: string | null; lookupFailed: boolean }> {
  if (!folder) return { id: null, name: null, lookupFailed: false };
  if (typeof folder === "object") {
    return {
      id: folder.id ?? null,
      name: folder.name?.trim().toLowerCase() ?? null,
      lookupFailed: false,
    };
  }
  const result = await getJson<{ data?: { id?: string; name?: string } }>(
    baseUrl,
    token,
    `/folders/${encodeURIComponent(folder)}?fields=id,name`,
  );
  if (!result.ok) return { id: folder, name: null, lookupFailed: true };
  return {
    id: result.data?.data?.id ?? folder,
    name: result.data?.data?.name?.trim().toLowerCase() ?? null,
    lookupFailed: false,
  };
}

async function findCompanyDocument(
  baseUrl: string,
  token: string,
  fileId: string,
): Promise<{ records: CompanyDocument[]; lookupFailed: boolean }> {
  const params = new URLSearchParams({
    "filter[directus_file_id][_eq]": fileId,
    fields: "company_id,directus_file_id",
    limit: "20",
  });
  const result = await getJson<DirectusCollectionResponse<CompanyDocument>>(
    baseUrl,
    token,
    `/items/vs_company_document?${params.toString()}`,
  );
  return { records: result.data?.data ?? [], lookupFailed: !result.ok };
}

async function findResumes(
  baseUrl: string,
  token: string,
  fileId: string,
): Promise<{ records: ResumeRecord[]; lookupFailed: boolean }> {
  const references = [fileId, `${baseUrl}/assets/${fileId}`];
  const records: ResumeRecord[] = [];
  let lookupFailed = false;
  for (const reference of references) {
    const params = new URLSearchParams({
      "filter[file_url][_eq]": reference,
      fields: "user_id,file_url",
      limit: "20",
    });
    const result = await getJson<DirectusCollectionResponse<ResumeRecord>>(
      baseUrl,
      token,
      `/items/vs_job_seeker_resumes?${params.toString()}`,
    );
    if (!result.ok) lookupFailed = true;
    for (const record of result.data?.data ?? []) {
      if (!records.some((existing) => sameId(existing.user_id, record.user_id))) records.push(record);
    }
  }
  return { records, lookupFailed };
}

async function findIdentityRecords(
  baseUrl: string,
  token: string,
  fileId: string,
): Promise<{ records: IdentityRecord[]; lookupFailed: boolean }> {
  const filters = [
    "gov_id_front_image_uuid",
    "gov_id_selfie_image_uuid",
    "address_doc_image_uuid",
  ];
  const records: IdentityRecord[] = [];
  let lookupFailed = false;
  for (const field of filters) {
    const params = new URLSearchParams({
      [`filter[${field}][_eq]`]: fileId,
      fields: "user_id",
      limit: "20",
    });
    const result = await getJson<DirectusCollectionResponse<IdentityRecord>>(
      baseUrl,
      token,
      `/items/vs_identity_verifications?${params.toString()}`,
    );
    if (!result.ok) lookupFailed = true;
    for (const record of result.data?.data ?? []) {
      if (!records.some((existing) => sameId(existing.user_id, record.user_id))) records.push(record);
    }
  }
  return { records, lookupFailed };
}

async function resolveClientCompany(
  baseUrl: string,
  token: string,
  userId: string | number,
): Promise<string | number | null> {
  const params = new URLSearchParams({
    "filter[user_id][_eq]": String(userId),
    fields: "company_id",
    limit: "10",
  });
  const result = await getJson<DirectusCollectionResponse<{ company_id?: string | number | { company_id?: string | number } }>>(
    baseUrl,
    token,
    `/items/vs_company_user?${params.toString()}`,
  );
  for (const link of result.data?.data ?? []) {
    const companyId = nestedId(link.company_id, "company_id");
    if (companyId !== null) return companyId;
  }
  return null;
}

async function clientMayViewResume(
  baseUrl: string,
  token: string,
  session: AuthenticatedSession,
  ownerUserId: string | number,
): Promise<boolean> {
  const companyId = await resolveClientCompany(baseUrl, token, session.userId);
  if (companyId === null) return false;

  const applicationParams = new URLSearchParams({
    "filter[user_id][_eq]": String(ownerUserId),
    fields: "job_id",
    limit: "500",
  });
  const applications = await getJson<DirectusCollectionResponse<{ job_id?: string | number }>>(
    baseUrl,
    token,
    `/items/vs_job_application?${applicationParams.toString()}`,
  );
  const jobIds = (applications.data?.data ?? [])
    .map((row) => row.job_id)
    .filter((id): id is string | number => id !== null && id !== undefined);
  if (jobIds.length > 0) {
    const jobParams = new URLSearchParams({
      "filter[job_id][_in]": jobIds.join(","),
      "filter[company_id][_eq]": String(companyId),
      fields: "job_id",
      limit: "1",
    });
    const jobs = await getJson<DirectusCollectionResponse<{ job_id?: string | number }>>(
      baseUrl,
      token,
      `/items/vs_job_posting?${jobParams.toString()}`,
    );
    if ((jobs.data?.data?.length ?? 0) > 0) return true;
  }

  // Talent-search clients may have access through an explicit saved-talent
  // relationship even before an application exists.
  const savedParams = new URLSearchParams({
    "filter[company_id][_eq]": String(companyId),
    "filter[applicant_user_id][_eq]": String(ownerUserId),
    fields: "saved_applicant_id",
    limit: "1",
  });
  const saved = await getJson<DirectusCollectionResponse<{ saved_applicant_id?: string | number }>>(
    baseUrl,
    token,
    `/items/vs_saved_applicant?${savedParams.toString()}`,
  );
  return (saved.data?.data?.length ?? 0) > 0;
}

/**
 * Classify a file from Directus metadata and authorize access to protected
 * registration-derived documents. Unknown files in a protected folder fail
 * closed and are only available to administrators.
 */
export async function authorizeAssetAccess(
  fileId: string,
  session: AuthenticatedSession | null,
): Promise<AssetAuthorization> {
  const config = directusConfig();
  if (!config) return { allowed: false, protected: true, notFound: false, kind: "UNKNOWN" };

  const metadata = await fetchFileMetadata(config.baseUrl, config.token, fileId);
  if (metadata.notFound) return { allowed: false, protected: false, notFound: true, kind: "UNKNOWN" };

  const folder = await resolveFolderName(config.baseUrl, config.token, metadata.file?.folder);
  const companyDocs = await findCompanyDocument(config.baseUrl, config.token, fileId);
  const resumes = await findResumes(config.baseUrl, config.token, fileId);
  const identities = await findIdentityRecords(config.baseUrl, config.token, fileId);

  const kind: ProtectedAssetKind = companyDocs.records.length
    ? "CLIENT_DOCUMENT"
    : identities.records.length
      ? "FREELANCER_IDENTITY"
      : resumes.records.length
        ? "FREELANCER_RESUME"
        : "UNKNOWN";
  const protectedByFolder = Boolean(
    folder.id && protectedFolderIds().has(folder.id),
  ) || Boolean(folder.name && PROTECTED_FOLDER_NAMES.has(folder.name));
  // Folder protection is the deployment-level boundary. If an ownership
  // lookup fails, fail closed: availability loss is safer than exposing a
  // protected document through a service-token proxy.
  const associationLookupFailed =
    companyDocs.lookupFailed || resumes.lookupFailed || identities.lookupFailed;
  const isProtected =
    metadata.lookupFailed ||
    folder.lookupFailed ||
    associationLookupFailed ||
    protectedByFolder ||
    kind !== "UNKNOWN";

  if (!isProtected) {
    // Public marketing/profile assets retain their existing unauthenticated
    // behavior; only protected folders/registration associations are gated.
    return { allowed: true, protected: false, notFound: false, kind };
  }
  if (!session) return { allowed: false, protected: true, notFound: false, kind };
  if (isAdministratorSession(session)) return { allowed: true, protected: true, notFound: false, kind };

  if (kind === "CLIENT_DOCUMENT" && isClientSession(session)) {
    const companyId = await resolveClientCompany(config.baseUrl, config.token, session.userId);
    const owned = companyDocs.records.some((record) =>
      sameId(nestedId(record.company_id, "company_id"), companyId),
    );
    return { allowed: owned, protected: true, notFound: false, kind };
  }

  if (kind === "FREELANCER_IDENTITY" && isFreelancerSession(session)) {
    const owned = identities.records.some((record) =>
      sameId(nestedId(record.user_id, "user_id"), session.userId),
    );
    return { allowed: owned, protected: true, notFound: false, kind };
  }

  if (kind === "FREELANCER_RESUME") {
    const ownerUserId = nestedId(resumes.records[0]?.user_id, "user_id");
    if (ownerUserId !== null && isFreelancerSession(session) && sameId(ownerUserId, session.userId)) {
      return { allowed: true, protected: true, notFound: false, kind };
    }
    if (ownerUserId !== null && isClientSession(session)) {
      const allowed = await clientMayViewResume(config.baseUrl, config.token, session, ownerUserId);
      return { allowed, protected: true, notFound: false, kind };
    }
  }

  // A protected file without a matching owner/authorized reviewer is denied.
  return { allowed: false, protected: true, notFound: false, kind };
}
