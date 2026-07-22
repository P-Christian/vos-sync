// src/modules/client/settings/types.ts

export interface UserProfile {
  user_id: number;
  user_email: string;
  user_fname: string;
  user_mname?: string | null;
  user_lname: string;
  user_contact: string;
  user_position?: string | null;
  user_department?: number | string | null;
  profile_image_url?: string | null;
  role: string;
}

export interface SecurityPayload {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
}

export interface TeamMember {
  company_user_id: number;
  company_id: number;
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_contact?: string | null;
  profile_image_url?: string | null;
  company_user_role: "OWNER" | "ADMIN" | "MEMBER";
  is_primary_contact: boolean;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  created_at?: string;
}

export interface AuthorizedIntegration {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "CONNECTED" | "DISCONNECTED" | "CONFIGURED";
  last_synced_at?: string | null;
  icon_name: string;
}
