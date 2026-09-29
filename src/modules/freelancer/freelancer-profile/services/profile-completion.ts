import type { FreelancerProfile } from "../types/freelancer-profile.types";

interface ProfileVerification {
  readonly status?: string;
  readonly type?: string;
}

export type ProfileCompletionStatus = "not_started" | "draft" | "complete" | "admin_verified";

export function computeProfileCompletion(
  profile: FreelancerProfile,
  verifications: readonly ProfileVerification[] = [],
): { readonly percent: number; readonly status: ProfileCompletionStatus } {
  let govId = 0;
  let address = 0;
  let mobileNumber = 0;

  for (const verification of verifications) {
    if (verification.status !== "approved") continue;
    if (verification.type === "gov_id") govId = 20;
    if (verification.type === "address") address = 20;
    if (verification.type === "mobile_number") mobileNumber = 20;
  }

  let completedSections = 0;
  if (profile.user_fname && profile.user_lname && profile.user_bday && profile.gender) completedSections++;
  if (profile.resumes && profile.resumes.length > 0) completedSections++;
  if (profile.job_seeker_profile?.[0]?.professional_summary) completedSections++;
  if (profile.skills && profile.skills.length > 0) completedSections++;
  if (profile.work_experience && profile.work_experience.length > 0) completedSections++;
  if (profile.education && profile.education.length > 0) completedSections++;

  const profileSections = Math.round((completedSections / 6) * 40);
  const percent = govId + address + mobileNumber + profileSections;
  const currentStatus = profile.job_seeker_profile?.[0]?.profile_status;
  const status: ProfileCompletionStatus =
    currentStatus === "admin_verified"
      ? "admin_verified"
      : percent === 100
        ? "complete"
        : percent > 0
          ? "draft"
          : "not_started";

  return { percent, status };
}
