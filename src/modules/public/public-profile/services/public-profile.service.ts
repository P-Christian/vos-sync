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

export interface PublicClientProfile {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  avatar_url?: string;
  headline: string;
}

export interface PublicSchoolAdminProfile {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  avatar_url?: string;
  headline: string;
  school_name?: string;
  school_type?: string;
  school_logo_url?: string | null;
  school_description?: string | null;
  school_email?: string | null;
  school_contact_no?: string | null;
  school_website?: string | null;
  school_address?: string;
  course_count?: number;
}

export async function getPublicFreelancerProfile(id: number, callerRole: number = 0): Promise<PublicFreelancerProfile | null> {
  try {
    const url = new URL(`${DIRECTUS_BASE}/items/vs_user/${id}`);
    url.searchParams.append("fields", "user_id,user_fname,user_lname,user_email,role_id,job_seeker_profile.*,vs_job_seeker_profile.*,user_image");

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
        avatar_url: user.user_image || undefined,
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
      avatar_url: user.user_image || undefined,
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

export async function getPublicClientProfile(id: number): Promise<PublicClientProfile | null> {
  try {
    const url = new URL(`${DIRECTUS_BASE}/items/vs_user/${id}`);
    url.searchParams.append("fields", "user_id,user_fname,user_lname,user_email,role_id,user_image");

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch public client profile:", await res.text());
      return null;
    }

    const json = await res.json();
    const user = json.data;

    if (!user || user.role_id !== 2) return null;

    return {
      user_id: user.user_id,
      user_fname: user.user_fname,
      user_lname: user.user_lname,
      user_email: user.user_email,
      avatar_url: user.user_image || undefined,
      headline: "Client",
    };
  } catch (err) {
    console.error("Error fetching public client profile:", err);
    return null;
  }
}

import { fetchSchoolByUserIdRepo } from "@/modules/school-admin/services/school-admin.repo";

export async function getPublicSchoolAdminProfile(id: number): Promise<PublicSchoolAdminProfile | null> {
  try {
    const url = new URL(`${DIRECTUS_BASE}/items/vs_user/${id}`);
    url.searchParams.append("fields", "user_id,user_fname,user_lname,user_email,role_id,user_image");

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch public school admin profile:", await res.text());
      return null;
    }

    const json = await res.json();
    const user = json.data;

    if (!user || user.role_id !== 4) return null;

    let school_name = undefined;
    let school_type = undefined;
    let school_logo_url = null;
    let school_description = null;
    let school_email = null;
    let school_contact_no = null;
    let school_website = null;
    let school_address = undefined;
    let course_count = 0;

    try {
      const schoolStats = await fetchSchoolByUserIdRepo(id);
      if (schoolStats) {
        school_name = schoolStats.school_name;
        school_type = schoolStats.school_type;
        school_logo_url = schoolStats.school_logo_url;
        school_description = schoolStats.school_description;
        school_email = schoolStats.school_email;
        school_contact_no = schoolStats.school_contact_no;
        school_website = schoolStats.school_website;
        
        const addressParts = [
          schoolStats.address_line,
          schoolStats.barangay,
          schoolStats.city_municipality,
          schoolStats.province,
          schoolStats.postal_code,
          schoolStats.country
        ].filter(Boolean);
        school_address = addressParts.join(", ");
        course_count = schoolStats.course_count;
      }
    } catch (e) {
      console.error("Failed to fetch school details for admin public profile:", e);
    }

    return {
      user_id: user.user_id,
      user_fname: user.user_fname,
      user_lname: user.user_lname,
      user_email: user.user_email,
      avatar_url: user.user_image || undefined,
      headline: "School Admin",
      school_name,
      school_type,
      school_logo_url,
      school_description,
      school_email,
      school_contact_no,
      school_website,
      school_address,
      course_count,
    };
  } catch (err) {
    console.error("Error fetching public school admin profile:", err);
    return null;
  }
}
