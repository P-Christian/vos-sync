import { CompanyVerificationRecord, VerificationDecisionPayload } from "../types";

export async function fetchCompanyVerifications(
  status?: string,
  search?: string
): Promise<CompanyVerificationRecord[]> {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.append("status", status);
  if (search && search.trim()) params.append("search", search.trim());

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/vos-admin/company-verification${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = "Failed to fetch company verifications from database";
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error) errMsg = parsed.error;
    } catch {
      /* ignore JSON parse error */
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data as CompanyVerificationRecord[];
  }
  return [];
}

export async function submitVerificationDecision(
  payload: VerificationDecisionPayload
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch("/api/vos-admin/company-verification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to submit verification decision to database");
  }

  const result = await response.json();
  return { success: true, message: result.message };
}
