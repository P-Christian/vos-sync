import { RegistrationError } from "./registration.errors";

type DirectusId = string | number;
type DirectusFilterValue = string | number | boolean | null;
// BOUNDED BEST-EFFORT application-level duplicate pre-check over Directus;
// this is explicitly not a concurrency/race-safe uniqueness guarantee.
const SCHOOL_IDENTITY_CANDIDATE_LIMIT = 500;
const SCHOOL_IDENTITY_CANDIDATE_PAGE_SIZE = 100;

interface DirectusResponse<T> {
  data?: T;
}

function provisioningError(message: string, status = 502): RegistrationError {
  return new RegistrationError(message, "PROVISIONING_FAILED", status);
}

/** Narrow service-token client used only by post-verification provisioners. */
export class RegistrationProvisioningRepository {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor() {
    const baseUrl = (
      process.env.DIRECTUS_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      ""
    ).replace(/\/$/u, "");
    const token = process.env.DIRECTUS_STATIC_TOKEN?.trim();
    if (!baseUrl || !token) {
      throw new RegistrationError(
        "Registration provisioning is not configured.",
        "CONFIGURATION_ERROR",
        503
      );
    }
    this.baseUrl = baseUrl;
    this.headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async findOne<T extends Record<string, unknown>>(
    collection: string,
    filter: Record<string, DirectusFilterValue>,
    fields: readonly string[]
  ): Promise<T | null> {
    const query = new URLSearchParams({ fields: fields.join(","), limit: "1" });
    for (const [field, value] of Object.entries(filter)) {
      if (value === null) query.set(`filter[${field}][_null]`, "true");
      else query.set(`filter[${field}][_eq]`, String(value));
    }
    const response = await this.request<DirectusResponse<T[]>>(
      `/items/${encodeURIComponent(collection)}?${query.toString()}`,
      { method: "GET", cache: "no-store" }
    );
    return Array.isArray(response.data) ? response.data[0] ?? null : null;
  }

  async findSchoolIdentityCandidates<T extends Record<string, unknown>>(
    fields: readonly string[]
  ): Promise<T[]> {
    const candidates: T[] = [];
    let offset = 0;

    while (candidates.length < SCHOOL_IDENTITY_CANDIDATE_LIMIT) {
      const pageLimit = Math.min(
        SCHOOL_IDENTITY_CANDIDATE_PAGE_SIZE,
        SCHOOL_IDENTITY_CANDIDATE_LIMIT - candidates.length
      );
      const query = new URLSearchParams({
        fields: fields.join(","),
        limit: String(pageLimit),
        offset: String(offset),
        sort: "school_name,school_id",
      });
      query.set("filter[school_name][_nnull]", "true");

      const response = await this.request<DirectusResponse<T[]>>(
        `/items/vs_school?${query.toString()}`,
        { method: "GET", cache: "no-store" }
      );
      const page = Array.isArray(response.data) ? response.data : [];
      candidates.push(...page);
      if (page.length < pageLimit) break;
      offset += pageLimit;
    }

    return candidates;
  }

  async findSchoolIdentityCandidatesForOwner<T extends Record<string, unknown>>(
    fields: readonly string[],
    ownerId: DirectusId
  ): Promise<T[]> {
    const candidates: T[] = [];
    let offset = 0;

    while (true) {
      const query = new URLSearchParams({
        fields: fields.join(","),
        limit: String(SCHOOL_IDENTITY_CANDIDATE_PAGE_SIZE),
        offset: String(offset),
        sort: "school_name,school_id",
      });
      query.set("filter[school_name][_nnull]", "true");
      query.set("filter[created_by][_eq]", String(ownerId));

      const response = await this.request<DirectusResponse<T[]>>(
        `/items/vs_school?${query.toString()}`,
        { method: "GET", cache: "no-store" }
      );
      const page = Array.isArray(response.data) ? response.data : [];
      candidates.push(...page);
      if (page.length < SCHOOL_IDENTITY_CANDIDATE_PAGE_SIZE) break;
      offset += SCHOOL_IDENTITY_CANDIDATE_PAGE_SIZE;
    }

    return candidates;
  }

  async findUserEmailById(userId: DirectusId): Promise<string | null> {
    const user = await this.findOne<Record<string, unknown>>(
      "vs_user",
      { user_id: userId },
      ["user_email"]
    );
    return typeof user?.user_email === "string" ? user.user_email : null;
  }

  async create<T extends Record<string, unknown>>(
    collection: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const response = await this.request<DirectusResponse<T>>(
      `/items/${encodeURIComponent(collection)}`,
      { method: "POST", body: JSON.stringify(data), cache: "no-store" }
    );
    if (!response.data) throw provisioningError("Directus returned no created record.");
    return response.data;
  }

  async update<T extends Record<string, unknown>>(
    collection: string,
    id: DirectusId,
    data: Record<string, unknown>
  ): Promise<T> {
    const response = await this.request<DirectusResponse<T>>(
      `/items/${encodeURIComponent(collection)}/${encodeURIComponent(String(id))}`,
      { method: "PATCH", body: JSON.stringify(data), cache: "no-store" }
    );
    if (!response.data) throw provisioningError("Directus returned no updated record.");
    return response.data;
  }

  async delete(collection: string, id: DirectusId): Promise<void> {
    await this.request<unknown>(
      `/items/${encodeURIComponent(collection)}/${encodeURIComponent(String(id))}`,
      { method: "DELETE", cache: "no-store" }
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.headers,
      });
    } catch {
      throw provisioningError("Registration provisioning dependency is unavailable.");
    }
    if (!response.ok) {
      const status = response.status === 409 ? 409 : 502;
      throw provisioningError("Registration provisioning write failed.", status);
    }
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw provisioningError("Registration provisioning returned an invalid response.");
    }
  }
}

export type { DirectusId, DirectusFilterValue };
