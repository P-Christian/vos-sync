export type DraftAction<T> = 
  | { type: 'ADD'; payload: Omit<T, 'id'> & { tempId: string } }
  | { type: 'UPDATE'; id: number; payload: Partial<T> }
  | { type: 'DELETE'; id: number };

export interface VsMasterSkill {
    id: number;
    skill_name: string;
}

export interface VsUserSkillMap {
    user_id: number;
    skill_id: number;
    skill: VsMasterSkill; // Assuming expanded relation
}

export interface VsUserSocialLink {
    id: number;
    user_id: number;
    platform_name: 'Github' | 'LinkedIn' | 'X (Twitter)' | 'Personal Portfolio';
    profile_url: string;
}

export interface VsJobSeekerProfile {
    profile_id: number;
    user_id: number;
    professional_summary: string | null;
    resume_file_url: string | null;
    profile_visibility: string;
    expected_salary: number | null;
    updated_at: string;
}

export interface VsJobSeekerResume {
    id: number;
    user_id: number;
    file_url: string;
    file_name: string | null;
    is_primary: boolean;
    uploaded_at: string;
}

export interface VsWorkExperienceMedia {
    id: number;
    experience_id: number;
    media_type: string;
    media_url: string;
    media_title: string | null;
    media_description: string | null;
}

export interface VsWorkExperience {
    id: number;
    user_id: number;
    company_name: string;
    location: string | null;
    location_type: string | null;
    job_title: string;
    employment_type: string | null;
    start_date: string;
    end_date: string | null;
    is_current_role: boolean;
    job_description: string | null;
    discovery_source: string | null;
    media?: VsWorkExperienceMedia[];
    skills?: { skill_id: number; skill?: VsMasterSkill }[];
}

export interface VsEducation {
    id?: number;
    employee_education_id?: number;
    user_id: number;
    school_id: number;
    school_course_id: number | null;
    start_date?: string | null;
    end_date?: string | null;
    
    // Virtual fields joined from DB for UI rendering
    school_name?: string;
    course_name?: string;
}

export interface VsCertification {
    id: number;
    user_id: number;
    certificate_name: string;
    issuing_organization: string;
    issue_date: string | null;
    credential_url: string | null;
    image_uuid?: string | null;
}

export interface FreelancerProfile {
    user_id: number;
    user_email: string;
    user_fname: string;
    user_mname: string | null;
    user_lname: string;
    suffix_name: string | null;
    nickname: string | null;
    user_contact: string;
    user_position: string | null;
    user_province: string | null;
    user_city: string | null;
    user_brgy: string | null;
    gender: string | null;
    civil_status: string | null;
    blood_type: string | null;
    religion: string | null;
    profile_image_url: string | null;
    user_bday: string | null;
    nationality: string | null;
    place_of_birth: string | null;
    
    // Relational fields fetched via Directus
    job_seeker_profile?: VsJobSeekerProfile[];
    social_links?: VsUserSocialLink[];
    work_experience?: VsWorkExperience[];
    education?: VsEducation[];
    certifications?: VsCertification[];
    skills?: VsUserSkillMap[];
    resumes?: VsJobSeekerResume[];
}
