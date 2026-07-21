// src/modules/shared/search/types.ts

export interface UserSearchResult {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  avatar_url?: string;
  headline?: string; // from vs_job_seeker_profile
}
