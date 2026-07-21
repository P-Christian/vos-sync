// src/modules/public/public-profile/services/public-profile.service.ts

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export interface PublicFreelancerProfile {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  avatar_url?: string;
  headline?: string;
  bio?: string;
  skills?: string[];
  portfolio_url?: string;
}

export async function getPublicFreelancerProfile(id: number, callerRole: number = 0): Promise<PublicFreelancerProfile | null> {
  try {
    const url = new URL(`${DIRECTUS_BASE}/items/vs_user/${id}`);
    url.searchParams.append("fields", "user_id,user_fname,user_lname,user_email,role_id,job_seeker_profile.*,vs_job_seeker_profile.*");

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store", // Don't cache since visibility depends on caller role
    });

    if (!res.ok) {
      console.error("Failed to fetch public profile:", await res.text());
      return null;
    }

    const json = await res.json();
    const user = json.data;

    if (!user) return null;

    // If it's a client (role_id=2), they don't have a job seeker profile, but we can still show their basic info
    if (user.role_id === 2) {
      return {
        user_id: user.user_id,
        user_fname: user.user_fname,
        user_lname: user.user_lname,
        user_email: user.user_email,
        headline: "Client",
      };
    }

    // Strict checks: must be a freelancer (role_id=1)
    if (user.role_id !== 1) return null;

    const rawProfiles = user.job_seeker_profile || user.vs_job_seeker_profile || [];
    const profiles = Array.isArray(rawProfiles) ? rawProfiles : [rawProfiles];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publicProfile = profiles.find((p: any) => {
      if (!p) return false;
      const vis = p.profile_visibility?.toLowerCase() || "";
      return vis === "public" || (vis === "recruiters only" && callerRole === 2);
    });

    if (!publicProfile) return null; // Profile is not public or not visible to this caller

    return {
      user_id: user.user_id,
      user_fname: user.user_fname,
      user_lname: user.user_lname,
      user_email: user.user_email, // Depending on privacy rules, email might be hidden, but we include it for MVP
      headline: publicProfile.professional_headline || "",
      bio: publicProfile.about_me || "",
      skills: publicProfile.skills || [],
      portfolio_url: publicProfile.portfolio_url || "",
    };
  } catch (err) {
    console.error("Error fetching public freelancer profile:", err);
    return null;
  }
}
