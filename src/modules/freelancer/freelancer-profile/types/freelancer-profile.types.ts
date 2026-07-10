export interface VsMasterSkill {
    id: number;
    skill_name: string;
}

export interface VsUserSkillMap {
    user_id: number;
    skill_id: number;
    skill: VsMasterSkill; // Assuming expanded relation
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

export interface VsWorkExperience {
    id: number;
    user_id: number;
    company_name: string;
    job_title: string;
    start_date: string;
    end_date: string | null;
    is_current_role: boolean;
    job_description: string | null;
}

export interface VsEducation {
    id: number;
    user_id: number;
    institution_name: string;
    degree: string | null;
    field_of_study: string | null;
    graduation_year: number | null;
}

export interface VsCertification {
    id: number;
    user_id: number;
    certificate_name: string;
    issuing_organization: string;
    issue_date: string | null;
    credential_url: string | null;
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
    user_bday: string | null;
    nationality: string | null;
    place_of_birth: string | null;
    
    // Relational fields fetched via Directus
    job_seeker_profile?: VsJobSeekerProfile[];
    work_experience?: VsWorkExperience[];
    education?: VsEducation[];
    certifications?: VsCertification[];
    skills?: VsUserSkillMap[];
}
