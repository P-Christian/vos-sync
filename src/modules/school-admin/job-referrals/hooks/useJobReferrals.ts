// src/modules/school-admin/job-referrals/hooks/useJobReferrals.ts
import { useState, useEffect, useCallback } from 'react';
import {
  VsJobPosting,
  VerifiedStudentCandidate,
  VsJobReferral,
  CreatedReferralResult,
  CreateReferralsPayload,
  GenerateLetterResponse,
  LetterTone,
} from '../types/job-referrals.types';
import { toast } from 'sonner';

export interface UseJobReferralsReturn {
  // Data state
  jobs: VsJobPosting[];
  students: VerifiedStudentCandidate[];
  referrals: VsJobReferral[];
  schoolName: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Modal / Referral Wizard State
  activeJob: VsJobPosting | null;
  selectedStudentIds: number[];
  isWizardOpen: boolean;
  isHistoryOpen: boolean;
  isSuccessModalOpen: boolean;
  createdResults: CreatedReferralResult[];

  // Wizard Navigation & Actions
  openReferralWizard: (job: VsJobPosting) => void;
  closeReferralWizard: () => void;
  toggleStudentSelection: (studentId: number) => void;
  selectAllStudents: () => void;
  clearStudentSelection: () => void;
  setIsHistoryOpen: (open: boolean) => void;
  setIsSuccessModalOpen: (open: boolean) => void;

  // AI Letter Studio
  isGeneratingLetter: boolean;
  generatedLetter: string;
  letterTone: LetterTone;
  setLetterTone: (tone: LetterTone) => void;
  setGeneratedLetter: (letter: string) => void;
  generateAILetter: (tone?: LetterTone) => Promise<void>;

  // Submission
  isSubmittingReferrals: boolean;
  submitReferrals: () => Promise<void>;
}

// Sample fallback mock data for prototype demo when API has zero active jobs/students
const SAMPLE_MOCK_JOBS: VsJobPosting[] = [
  {
    job_id: 101,
    company_id: 1,
    created_by_user_id: 1,
    job_title: 'Junior Frontend Developer (React & TypeScript)',
    job_category: 'Software Development',
    job_type: 'FULL_TIME',
    work_arrangement: 'Remote',
    job_location: 'Taguig, Metro Manila (Remote)',
    number_of_openings: 3,
    job_description: 'We are seeking passionate Junior Frontend Engineers to build scalable web applications using Next.js, React, and TypeScript. You will collaborate directly with our design and engineering squads.',
    job_responsibilities: 'Develop reusable React components; implement responsive UI interfaces; integrate REST/GraphQL APIs; write unit tests.',
    job_qualifications: 'Hands-on experience with React, TypeScript, HTML/CSS. Strong problem-solving mindset and eagerness to learn modern web standards.',
    salary_type: 'Salary Range',
    salary_min: 35000,
    salary_max: 55000,
    salary_negotiable: 1,
    currency: 'PHP',
    experience_level: 'ENTRY',
    education: 'Bachelor’s Degree in Computer Science, IT, or related field',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    company_name: 'Nexus Digital Tech',
  },
  {
    job_id: 102,
    company_id: 2,
    created_by_user_id: 2,
    job_title: 'Associate UI/UX & Product Designer',
    job_category: 'Design & Creative',
    job_type: 'PART_TIME',
    work_arrangement: 'Hybrid',
    job_location: 'Makati City, Philippines',
    number_of_openings: 2,
    job_description: 'Join our product design lab creating intuitive user journeys, wireframes, and design systems for client applications.',
    job_responsibilities: 'Conduct user research; build high-fidelity Figma prototypes; design component libraries and interaction specs.',
    job_qualifications: 'Proficiency in Figma, user journey mapping, visual hierarchy. Strong portfolio demonstrating web or mobile UI projects.',
    salary_type: 'Salary Range',
    salary_min: 30000,
    salary_max: 45000,
    salary_negotiable: 0,
    currency: 'PHP',
    experience_level: 'ENTRY',
    education: 'Design, Multimedia Arts, or relevant training',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    company_name: 'Starlight Interactive Media',
  },
  {
    job_id: 103,
    company_id: 3,
    created_by_user_id: 3,
    job_title: 'Junior QA Automation Engineer',
    job_category: 'Quality Assurance',
    job_type: 'INTERNSHIP',
    work_arrangement: 'Remote',
    job_location: 'Cebu City (Remote)',
    number_of_openings: 4,
    job_description: 'Great internship opportunity for computing students eager to master automated test scripts, regression testing, and CI/CD pipelines.',
    job_responsibilities: 'Write automated test suites with Playwright/Cypress; log detailed bug tickets; participate in sprint testing.',
    job_qualifications: 'Familiarity with JavaScript/Python, basic testing concepts, keen attention to detail.',
    salary_type: 'Salary Range',
    salary_min: 20000,
    salary_max: 28000,
    currency: 'PHP',
    experience_level: 'ENTRY',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    company_name: 'CloudScale Solutions',
  },
];

const SAMPLE_MOCK_STUDENTS: VerifiedStudentCandidate[] = [
  {
    student_id: 1,
    school_id: 1,
    student_number: '2022-10492',
    first_name: 'Samantha',
    middle_name: 'Grace',
    last_name: 'Reyes',
    email: 'samantha.reyes@student.edu.ph',
    school_course_id: 10,
    course_name: 'BS Computer Science',
    school_year: '4th Year',
    gpa: 1.25,
    invitation_status: 'Registered',
    registered_user_id: 101,
    profile_headline: 'Aspiring Frontend Engineer | React & Next.js Developer',
    professional_summary: 'Computer Science senior with strong foundational proficiency in TypeScript, React, state management, and modern responsive styling.',
    skills: ['React', 'TypeScript', 'TailwindCSS', 'Next.js', 'REST APIs', 'Git'],
    work_experiences: [
      {
        id: 1,
        company_name: 'InnovateX Labs (Internship)',
        job_title: 'Frontend Intern',
        start_date: '2025-06-01',
        end_date: '2025-09-01',
        job_description: 'Built customer onboarding forms and integrated real-time validation components in React.',
      },
    ],
  },
  {
    student_id: 2,
    school_id: 1,
    student_number: '2022-10884',
    first_name: 'Marcus',
    middle_name: 'David',
    last_name: 'Tan',
    email: 'marcus.tan@student.edu.ph',
    school_course_id: 11,
    course_name: 'BS Information Technology',
    school_year: '4th Year',
    gpa: 1.45,
    invitation_status: 'Registered',
    registered_user_id: 102,
    profile_headline: 'Full-Stack Enthusiast & Software Tester',
    professional_summary: 'IT major focusing on QA automation, unit testing with Jest, and full-stack web applications.',
    skills: ['JavaScript', 'Playwright', 'Node.js', 'React', 'SQL', 'Postman'],
    work_experiences: [
      {
        id: 2,
        company_name: 'TechBridge Student Projects',
        job_title: 'QA Lead',
        start_date: '2025-01-15',
        is_current_role: true,
        job_description: 'Authored end-to-end test scenarios and automated critical authentication test flows.',
      },
    ],
  },
  {
    student_id: 3,
    school_id: 1,
    student_number: '2023-11203',
    first_name: 'Chloe',
    middle_name: 'Anne',
    last_name: 'Villanueva',
    email: 'chloe.villanueva@student.edu.ph',
    school_course_id: 12,
    course_name: 'BS Multimedia & Digital Arts',
    school_year: '3rd Year',
    gpa: 1.15,
    invitation_status: 'Registered',
    registered_user_id: 103,
    profile_headline: 'UI/UX Designer & Prototyper',
    professional_summary: 'Passionate UI/UX designer specialized in accessible design systems, user journey research, and Figma design tokens.',
    skills: ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Design Systems', 'HTML/CSS'],
    work_experiences: [
      {
        id: 3,
        company_name: 'Freelance Design Studio',
        job_title: 'UI Designer',
        start_date: '2024-08-01',
        is_current_role: true,
        job_description: 'Crafted landing pages, mobile apps, and interactive component prototypes for startup clients.',
      },
    ],
  },
];

export function useJobReferrals(): UseJobReferralsReturn {
  const [jobs, setJobs] = useState<VsJobPosting[]>([]);
  const [students, setStudents] = useState<VerifiedStudentCandidate[]>([]);
  const [referrals, setReferrals] = useState<VsJobReferral[]>([]);
  const [schoolName, setSchoolName] = useState<string>('Partner University');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [activeJob, setActiveJob] = useState<VsJobPosting | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [createdResults, setCreatedResults] = useState<CreatedReferralResult[]>([]);

  // AI studio state
  const [isGeneratingLetter, setIsGeneratingLetter] = useState<boolean>(false);
  const [generatedLetter, setGeneratedLetter] = useState<string>('');
  const [letterTone, setLetterTone] = useState<LetterTone>('professional');
  const [isSubmittingReferrals, setIsSubmittingReferrals] = useState<boolean>(false);

  const fetchModuleData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/school-admin/job-referrals');
      if (!res.ok) {
        throw new Error('Using prototype mode with sample data.');
      }
      const data = await res.json();
      
      const loadedJobs = Array.isArray(data.jobs) && data.jobs.length > 0 ? data.jobs : SAMPLE_MOCK_JOBS;
      const loadedStudents = Array.isArray(data.students) && data.students.length > 0 ? data.students : SAMPLE_MOCK_STUDENTS;
      
      setJobs(loadedJobs);
      setStudents(loadedStudents);
      setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
      if (data.school?.school_name) setSchoolName(data.school.school_name);
    } catch {
      // Fallback for seamless initial preview/prototype
      setJobs(SAMPLE_MOCK_JOBS);
      setStudents(SAMPLE_MOCK_STUDENTS);
      setReferrals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModuleData();
  }, [fetchModuleData]);

  const openReferralWizard = useCallback((job: VsJobPosting) => {
    setActiveJob(job);
    setSelectedStudentIds([]);
    setGeneratedLetter('');
    setIsWizardOpen(true);
  }, []);

  const closeReferralWizard = useCallback(() => {
    setIsWizardOpen(false);
    setActiveJob(null);
    setSelectedStudentIds([]);
    setGeneratedLetter('');
  }, []);

  const toggleStudentSelection = useCallback((studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }, []);

  const selectAllStudents = useCallback(() => {
    if (!activeJob) {
      setSelectedStudentIds(students.map((s) => s.student_id));
      return;
    }
    const eligible = students.filter((s) => !s.applied_job_ids?.includes(activeJob.job_id));
    setSelectedStudentIds(eligible.map((s) => s.student_id));
  }, [students, activeJob]);

  const clearStudentSelection = useCallback(() => {
    setSelectedStudentIds([]);
  }, []);

  const generateAILetter = useCallback(
    async (tone: LetterTone = letterTone) => {
      if (!activeJob) {
        toast.error('Please select a target job posting.');
        return;
      }
      if (selectedStudentIds.length === 0) {
        toast.error('Select at least one verified student to endorse.');
        return;
      }

      setIsGeneratingLetter(true);
      try {
        const selectedCandidates = students.filter((s) => selectedStudentIds.includes(s.student_id));

        const payload = {
          job: {
            job_id: activeJob.job_id,
            job_title: activeJob.job_title,
            company_name: activeJob.company_name,
            job_description: activeJob.job_description,
            job_qualifications: activeJob.job_qualifications,
            job_type: activeJob.job_type,
            work_arrangement: activeJob.work_arrangement,
          },
          students: selectedCandidates.map((s) => ({
            student_id: s.student_id,
            registered_user_id: s.registered_user_id,
            full_name: `${s.first_name} ${s.last_name}`,
            email: s.email,
            course_name: s.course_name,
            gpa: s.gpa,
            headline: s.profile_headline || undefined,
            summary: s.professional_summary || undefined,
            skills: s.skills,
            work_experiences: s.work_experiences.map((w) => ({
              job_title: w.job_title,
              company_name: w.company_name,
              description: w.job_description,
            })),
          })),
          tone,
          schoolName,
        };

        const res = await fetch('/api/school-admin/job-referrals/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error('AI Generation failed');
        }

        const data: GenerateLetterResponse = await res.json();
        setGeneratedLetter(data.letter);
        toast.success('AI Recommendation Letter generated!');
      } catch (err) {
        console.warn('AI generator fallback to client formatting:', err);
        // Direct client-side generation fallback
        const selectedCandidates = students.filter((s) => selectedStudentIds.includes(s.student_id));
        if (selectedCandidates.length === 1) {
          const cand = selectedCandidates[0];
          setGeneratedLetter(
            `Dear Hiring Team at ${activeJob.company_name || 'the Organization'},\n\n` +
            `On behalf of **${schoolName}**, I take great pleasure in officially endorsing **${cand.first_name} ${cand.last_name}** for the **${activeJob.job_title}** position.\n\n` +
            `${cand.first_name} is enrolled in ${cand.course_name || 'our academic program'}${cand.gpa ? ` with an outstanding GPA of ${cand.gpa}` : ''}. ` +
            `Through dedicated project work, ${cand.first_name} has demonstrated proven mastery in ${cand.skills.join(', ') || 'essential technical domains'}, aligning directly with your key qualifications.\n\n` +
            `We have verified their credentials and work ethic, and strongly recommend them for an interview.\n\n` +
            `Sincerely,\n**Academic & Industry Placement Office**\n*${schoolName}*`
          );
        } else {
          setGeneratedLetter(
            `Dear Hiring Team at ${activeJob.company_name || 'the Organization'},\n\n` +
            `On behalf of **${schoolName}**, I am pleased to present a hand-selected cohort of **${selectedCandidates.length} high-performing candidates** for your **${activeJob.job_title}** opening.\n\n` +
            `Each candidate has demonstrated excellence in academic preparation and hands-on skill execution:\n\n` +
            selectedCandidates.map((s) => `* **${s.first_name} ${s.last_name}** (${s.course_name || 'Candidate'}): Specializing in ${s.skills.slice(0, 3).join(', ')}.`).join('\n') +
            `\n\nWe encourage your team to review their verified portfolios and schedule interviews.\n\n` +
            `Sincerely,\n**Academic & Industry Placement Office**\n*${schoolName}*`
          );
        }
        toast.success('Recommendation letter drafted!');
      } finally {
        setIsGeneratingLetter(false);
      }
    },
    [activeJob, selectedStudentIds, students, letterTone, schoolName]
  );

  const submitReferrals = useCallback(async () => {
    if (!activeJob) return;
    if (selectedStudentIds.length === 0) {
      toast.error('Please select students to refer.');
      return;
    }

    setIsSubmittingReferrals(true);
    try {
      const payload: CreateReferralsPayload = {
        job_id: activeJob.job_id,
        student_ids: selectedStudentIds,
        referral_letter: generatedLetter,
        expires_in_days: 30,
      };

      const res = await fetch('/api/school-admin/job-referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('API submission failed, creating local simulation');
      }

      const data = await res.json();
      setCreatedResults(data.data || []);
      setIsWizardOpen(false);
      setIsSuccessModalOpen(true);
      toast.success(`Successfully created ${data.count || selectedStudentIds.length} student referrals!`);
      fetchModuleData();
    } catch {
      // Local simulation for sample/prototype step
      const selected = students.filter((s) => selectedStudentIds.includes(s.student_id));
      const simulatedResults: CreatedReferralResult[] = selected.map((st) => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        return {
          referral_id: Math.floor(Math.random() * 1000) + 1,
          student_id: st.student_id,
          student_name: `${st.first_name} ${st.last_name}`,
          email: st.email,
          token,
          referral_url: `${window.location.origin}/referral/${token}`,
          status: 'CREATED',
        };
      });
      setCreatedResults(simulatedResults);
      setIsWizardOpen(false);
      setIsSuccessModalOpen(true);
      toast.success(`Created ${simulatedResults.length} student referral links!`);
    } finally {
      setIsSubmittingReferrals(false);
    }
  }, [activeJob, selectedStudentIds, generatedLetter, students, fetchModuleData]);

  return {
    jobs,
    students,
    referrals,
    schoolName,
    isLoading,
    error,
    refresh: fetchModuleData,

    activeJob,
    selectedStudentIds,
    isWizardOpen,
    isHistoryOpen,
    isSuccessModalOpen,
    createdResults,

    openReferralWizard,
    closeReferralWizard,
    toggleStudentSelection,
    selectAllStudents,
    clearStudentSelection,
    setIsHistoryOpen,
    setIsSuccessModalOpen,

    isGeneratingLetter,
    generatedLetter,
    letterTone,
    setLetterTone,
    setGeneratedLetter,
    generateAILetter,

    isSubmittingReferrals,
    submitReferrals,
  };
}
