// src/modules/shared/search/types.ts

export type SearchEntityType = "freelancer" | "client" | "school-admin";

export interface UserSearchResult {
  user_id: number;
  role_id: number;
  name: string;
  user_fname?: string;
  user_lname?: string;
  user_email?: string;
  avatar_url?: string;
  headline?: string;
  entity_type: SearchEntityType;
  badge_label: "Freelancer" | "Company" | "School";
  location?: string;
}

