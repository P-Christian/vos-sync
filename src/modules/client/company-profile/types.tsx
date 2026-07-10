// src/modules/client/company-profile/types.tsx

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

export interface CompanyProfile {
  company_id: number;
  company_code: string;
  company_name: string;
  company_email?: string | null;
  company_contact?: string | null;
  company_website?: string | null;
  company_description?: string | null;
  industry: string;
  business_type?: string | null;
  company_size?: string | null;
  company_province: string;
  company_city: string;
  company_brgy?: string | null;
  company_address?: string | null;
  company_zipCode?: string | null;
  verification_status: VerificationStatus;
  verification_remarks?: string | null;
  profile_completion_percent?: number;
  is_active?: number;
  is_deleted?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyProfileMeta {
  company_user_role: "OWNER" | "ADMIN" | "MEMBER";
  is_primary_contact: number;
}

export interface CompanyProfileState {
  company: CompanyProfile | null;
  meta: CompanyProfileMeta | null;
  loading: boolean;
  saving: boolean;
  error: string;
  successMessage: string;
}

export type EditableCompanyFields = Pick<
  CompanyProfile,
  | "company_name"
  | "company_email"
  | "company_contact"
  | "company_website"
  | "company_description"
  | "industry"
  | "business_type"
  | "company_size"
  | "company_province"
  | "company_city"
  | "company_brgy"
  | "company_address"
  | "company_zipCode"
>;

