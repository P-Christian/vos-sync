/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface PublicWorkExperience {
  company_name: string;
  job_title: string;
  location?: string | null;
  location_type?: string | null;
  employment_type?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current_role: boolean;
  job_description?: string | null;
}

export interface PublicEducation {
  school_name?: string;
  school_name_raw?: string | null;
  course_name?: string;
  course_name_raw?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface PublicCertification {
  certificate_name: string;
  issuing_organization: string;
  issue_date?: string | null;
  credential_url?: string | null;
}

export interface PublicJobPreferences {
  job_type?: string | null;
  work_setup?: string | null;
  preferred_location?: string | null;
  salary_range_min?: number | null;
  salary_range_max?: number | null;
  currency?: string | null;
  availability?: string | null;
  preferred_industry?: string | null;
}

export interface PublicSocialLink {
  platform_name: string;
  profile_url: string;
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
  work_experience?: PublicWorkExperience[];
  education?: PublicEducation[];
  certifications?: PublicCertification[];
  job_preferences?: PublicJobPreferences | null;
  social_links?: PublicSocialLink[];
}

export interface PublicClientProfile {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  avatar_url?: string;
  headline: string;
  company?: {
    company_name: string;
    company_description?: string | null;
    company_website?: string | null;
    company_email?: string | null;
    company_contact?: string | null;
    company_logo?: string | null;
    company_address?: string | null;
  } | null;
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
    url.searchParams.append(
      "fields",
      "user_id,user_fname,user_lname,user_email,role_id,user_position,job_seeker_profile.*,vs_job_seeker_profile.*,profile_image_url,skills.skill_id.skill_name,vs_user_skills_map.skill_id.skill_name,vs_work_experience.*,work_experience.*,vs_employee_education.*,education.*,vs_employee_education.school_id.*,vs_employee_education.school_course_id.*,vs_certifications.*,certifications.*,vs_job_preferences.*,job_preferences.*,vs_user_social_links.*,social_links.*"
    );

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

    let rawProfiles = user.job_seeker_profile || user.vs_job_seeker_profile || [];
    if (!rawProfiles || rawProfiles.length === 0) {
      try {
        const profileUrl = `${DIRECTUS_BASE}/items/vs_job_seeker_profile?filter[user_id][_eq]=${id}`;
        const profileRes = await fetch(profileUrl, { headers: getHeaders(), cache: "no-store" });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          rawProfiles = profileData.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch job seeker profile fallback:", err);
      }
    }
    const profiles = Array.isArray(rawProfiles) ? rawProfiles : [rawProfiles];
    const publicProfile = profiles.find((p: any) => {
      if (!p) return false;
      const vis = p.profile_visibility?.toLowerCase() || "";
      return vis === "public" || (vis === "recruiters only" && callerRole === 2);
    });

    if (!publicProfile) return null; // Profile is not public or not visible to this caller

    let rawSkills = user.skills || user.vs_user_skills_map || [];
    if (!rawSkills || rawSkills.length === 0) {
      try {
        const skillsUrl = `${DIRECTUS_BASE}/items/vs_user_skills_map?filter[user_id][_eq]=${id}&fields=*,skill_id.*`;
        const skillsRes = await fetch(skillsUrl, { headers: getHeaders(), cache: "no-store" });
        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          rawSkills = skillsData.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch skills fallback:", err);
      }
    }
    const skillList = rawSkills
      .map((s: any) => s.skill_id?.skill_name || s.skill?.skill_name)
      .filter(Boolean);

    // Map Work Experience
    let rawWork = user.vs_work_experience || user.work_experience || [];
    if (!rawWork || rawWork.length === 0) {
      try {
        const expUrl = `${DIRECTUS_BASE}/items/vs_work_experience?filter[user_id][_eq]=${id}`;
        const expRes = await fetch(expUrl, { headers: getHeaders(), cache: "no-store" });
        if (expRes.ok) {
          const expData = await expRes.json();
          rawWork = expData.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch work experience fallback:", err);
      }
    }
    const workExperience: PublicWorkExperience[] = rawWork.map((w: any) => ({
      company_name: w.company_name,
      job_title: w.job_title,
      location: w.location,
      location_type: w.location_type,
      employment_type: w.employment_type,
      start_date: w.start_date,
      end_date: w.end_date,
      is_current_role: !!w.is_current_role,
      job_description: w.job_description,
    }));

    // Map Education
    let rawEdu = user.vs_employee_education || user.education || [];
    if (!rawEdu || rawEdu.length === 0) {
      try {
        const eduUrl = `${DIRECTUS_BASE}/items/vs_employee_education?filter[user_id][_eq]=${id}&fields=*,school_id.*,school_course_id.*`;
        const eduRes = await fetch(eduUrl, { headers: getHeaders(), cache: "no-store" });
        if (eduRes.ok) {
          const eduData = await eduRes.json();
          rawEdu = eduData.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch education fallback:", err);
      }
    }
    const education: PublicEducation[] = rawEdu.map((edu: any) => ({
      school_name: typeof edu.school_id === 'object' ? edu.school_id?.school_name : edu.school_name,
      school_name_raw: edu.school_name_raw,
      course_name: typeof edu.school_course_id === 'object' ? edu.school_course_id?.course_name : edu.course_name,
      course_name_raw: edu.course_name_raw,
      start_date: edu.start_date,
      end_date: edu.end_date
    }));

    // Map Certifications
    let rawCert = user.vs_certifications || user.certifications || [];
    if (!rawCert || rawCert.length === 0) {
      try {
        const certUrl = `${DIRECTUS_BASE}/items/vs_certifications?filter[user_id][_eq]=${id}`;
        const certRes = await fetch(certUrl, { headers: getHeaders(), cache: "no-store" });
        if (certRes.ok) {
          const certData = await certRes.json();
          rawCert = certData.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch certifications fallback:", err);
      }
    }
    const certifications: PublicCertification[] = rawCert.map((c: any) => ({
      certificate_name: c.certificate_name,
      issuing_organization: c.issuing_organization,
      issue_date: c.issue_date,
      credential_url: c.credential_url,
    }));

    // Map Job Preferences
    let rawPrefs = user.vs_job_preferences || user.job_preferences || [];
    if (!rawPrefs || rawPrefs.length === 0) {
      try {
        const prefsUrl = `${DIRECTUS_BASE}/items/vs_job_preferences?filter[user_id][_eq]=${id}`;
        const prefsRes = await fetch(prefsUrl, { headers: getHeaders(), cache: "no-store" });
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          rawPrefs = prefsData.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch job preferences fallback:", err);
      }
    }
    const pref = Array.isArray(rawPrefs) ? rawPrefs[0] : rawPrefs;
    const jobPreferences: PublicJobPreferences | null = pref ? {
      job_type: pref.job_type,
      work_setup: pref.work_setup,
      preferred_location: pref.preferred_location,
      salary_range_min: pref.salary_range_min,
      salary_range_max: pref.salary_range_max,
      currency: pref.currency,
      availability: pref.availability,
      preferred_industry: pref.preferred_industry,
    } : null;

    // Map Social Links
    let rawSocial = user.vs_user_social_links || user.social_links || [];
    if (!rawSocial || rawSocial.length === 0) {
      try {
        const socialUrl = `${DIRECTUS_BASE}/items/vs_user_social_links?filter[user_id][_eq]=${id}`;
        const socialRes = await fetch(socialUrl, { headers: getHeaders(), cache: "no-store" });
        if (socialRes.ok) {
          const socialData = await socialRes.json();
          rawSocial = socialData.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch social links fallback:", err);
      }
    }
    const socialLinks: PublicSocialLink[] = rawSocial.map((s: any) => ({
      platform_name: s.platform_name,
      profile_url: s.profile_url,
    }));

    return {
      user_id: user.user_id,
      user_fname: user.user_fname,
      user_lname: user.user_lname,
      user_email: user.user_email, // Depending on privacy rules, email might be hidden, but we include it for MVP
      avatar_url: user.profile_image_url ? `${DIRECTUS_BASE}/assets/${user.profile_image_url}` : undefined,
      headline: user.user_position || publicProfile.professional_headline || "Freelancer",
      bio: publicProfile.professional_summary || publicProfile.about_me || "",
      skills: skillList,
      portfolio_url: publicProfile.portfolio_url || "",
      work_experience: workExperience,
      education,
      certifications,
      job_preferences: jobPreferences,
      social_links: socialLinks,
    };
  } catch (err) {
    console.error("Error fetching public freelancer profile:", err);
    return null;
  }
}

export async function getPublicClientProfile(id: number): Promise<PublicClientProfile | null> {
  try {
    const url = new URL(`${DIRECTUS_BASE}/items/vs_user/${id}`);
    url.searchParams.append("fields", "user_id,user_fname,user_lname,user_email,role_id,profile_image_url");

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

    // Fetch company association
    let companyDetails = null;
    try {
      const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${id}&fields=company_id.*&limit=1`;
      const linkRes = await fetch(linkUrl, { headers: getHeaders(), cache: "no-store" });
      if (linkRes.ok) {
        const linkJson = await linkRes.json();
        const association = linkJson.data?.[0];
        if (association && association.company_id) {
          const comp = association.company_id;
          const addressParts = [
            comp.company_address,
            comp.company_brgy,
            comp.company_city,
            comp.company_province
          ].filter(Boolean);
          
          companyDetails = {
            company_name: comp.company_name,
            company_description: comp.company_description,
            company_website: comp.company_website,
            company_email: comp.company_email,
            company_contact: comp.company_contact,
            company_logo: comp.company_logo ? `${DIRECTUS_BASE}/assets/${comp.company_logo}` : null,
            company_address: addressParts.join(", ") || null,
          };
        }
      }
    } catch (err) {
      console.error("Failed to fetch company details for public profile:", err);
    }

    return {
      user_id: user.user_id,
      user_fname: user.user_fname,
      user_lname: user.user_lname,
      user_email: user.user_email,
      avatar_url: user.profile_image_url ? `${DIRECTUS_BASE}/assets/${user.profile_image_url}` : undefined,
      headline: "Client",
      company: companyDetails,
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
    url.searchParams.append("fields", "user_id,user_fname,user_lname,user_email,role_id,profile_image_url");

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
      avatar_url: user.profile_image_url ? `${DIRECTUS_BASE}/assets/${user.profile_image_url}` : undefined,
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
