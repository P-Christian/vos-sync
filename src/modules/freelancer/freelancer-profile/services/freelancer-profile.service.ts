import { FreelancerProfile } from "../types/freelancer-profile.types";

export const MOCK_FREELANCER_PROFILE: FreelancerProfile = {
    id: "mock-001",
    fullName: "Julian Sterling",
    primaryRole: "Senior Product Designer",
    email: "j.sterling@design.com",
    location: "San Francisco, CA",
    summary: "Dedicated Product Designer with over 10 years of experience in creating intuitive digital experiences for Fortune 500 companies. Expert in balancing business objectives with user-centric design principles. I thrive in collaborative environments and am passionate about developing scalable design systems that drive product growth and sustainable user engagement.",
    coreSkills: [
        { id: "s1", label: "User Experience (UX)" },
        { id: "s2", label: "User Interface (UI)" },
        { id: "s3", label: "Design Systems" },
        { id: "s4", label: "Interaction Design" },
        { id: "s5", label: "Prototyping" },
        { id: "s6", label: "Figma Expert" },
        { id: "s7", label: "User Research" },
        { id: "s8", label: "Stakeholder Mgmt" },
    ],
    resume: {
        name: "sterling_cv_2023.pdf",
        updatedAt: "UPDATED OCT 12",
        parsingStatus: "OPTIMIZED",
    },
    workExperience: [
        {
            id: "we1",
            title: "Senior Product Designer",
            company: "TechFlow Inc.",
            startDate: "2020",
            current: true,
            description: "Led the redesign of the core enterprise dashboard, resulting in a 40% increase in user engagement. Mentored junior designers and established the company's first comprehensive design system."
        },
        {
            id: "we2",
            title: "UX Designer",
            company: "Creative Solutions LLC",
            startDate: "2016",
            endDate: "2020",
            current: false,
            description: "Developed user journeys and wireframes for various e-commerce platforms. Conducted user testing sessions to iterate on designs based on direct feedback."
        }
    ],
    education: [
        {
            id: "ed1",
            degree: "B.S. in Human-Computer Interaction",
            institution: "University of Washington",
            graduationYear: "2015"
        }
    ],
    certifications: [
        {
            id: "cert1",
            name: "Certified UX Professional",
            issuer: "Nielsen Norman Group",
            issueDate: "2018"
        },
        {
            id: "cert2",
            name: "Google UX Design Professional Certificate",
            issuer: "Coursera",
            issueDate: "2021"
        }
    ]
};

export function getMockFreelancerProfile(): FreelancerProfile {
    return { ...MOCK_FREELANCER_PROFILE };
}

export function buildInitials(name: string): string {
    if (!name) return "U";
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
}
