// src/modules/vos-admin/user-management/types/user.types.ts

export interface VsUser {
  user_id: number;
  user_email: string;
  user_fname: string;
  user_mname?: string | null;
  user_lname: string;
  suffix_name?: string | null;
  nickname?: string | null;
  user_contact: string;
  role: string;
  role_id: number | null;
  is_blocked: boolean | number;
  user_province?: string | null;
  user_city?: string | null;
  user_brgy?: string | null;
  user_image?: string | null;
  profile_image_url?: string | null;
  isAdmin: boolean | number;
  verifications?: IdentityVerification[];
}

export interface IdentityVerification {
  id: number;
  user_id: number;
  type: 'gov_id' | 'address' | 'mobile_number';
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  rejection_note?: string | null;
  gov_id_type?: string | null;
  gov_id_front_image_uuid?: string | null;
  gov_id_selfie_image_uuid?: string | null;
  address_doc_image_uuid?: string | null;
  mobile_number?: string | null;
  mobile_verified?: boolean | number;
}

export interface UserWithVerification extends VsUser {
  verifications: IdentityVerification[];
}

export interface ReviewVerificationAction {
  status: 'approved' | 'rejected';
  rejection_note?: string;
}
