export interface FreelancerSkill {
    id: string;
    label: string;
}

export interface ResumeFile {
    name: string;
    updatedAt: string;
    parsingStatus: "OPTIMIZED" | "PENDING" | "FAILED";
}

export interface WorkExperience {
    id: string;
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
}

export interface Education {
    id: string;
    degree: string;
    institution: string;
    graduationYear: string;
}

export interface Certification {
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
}

export interface FreelancerProfile {
    id: string;
    fullName: string;
    primaryRole: string;
    email: string;
    location: string;
    summary: string;
    coreSkills: FreelancerSkill[];
    resume: ResumeFile | null;
    workExperience: WorkExperience[];
    education: Education[];
    certifications: Certification[];
}
