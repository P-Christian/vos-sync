import { NextResponse } from "next/server";

export interface CourseProgram {
  title: string;
  code: string;
  defaultDegree: string;
}

const DEGREE_LEVELS = [
  "Bachelor of Science",
  "Bachelor of Arts",
  "Master of Science",
  "Master of Arts",
  "Doctor of Philosophy",
  "Associate Degree",
  "Diploma / TVET Certificate",
  "Senior High School Track"
];

const COMMON_PROGRAMS: CourseProgram[] = [
  { title: "Information Technology", code: "IT", defaultDegree: "Bachelor of Science" },
  { title: "Computer Science", code: "CS", defaultDegree: "Bachelor of Science" },
  { title: "Business Administration", code: "BSBA", defaultDegree: "Bachelor of Science" },
  { title: "Accountancy", code: "BSA", defaultDegree: "Bachelor of Science" },
  { title: "Nursing", code: "BSN", defaultDegree: "Bachelor of Science" },
  { title: "Civil Engineering", code: "BSCE", defaultDegree: "Bachelor of Science" },
  { title: "Psychology", code: "BSP", defaultDegree: "Bachelor of Science" },
  { title: "Hospitality Management", code: "BSHM", defaultDegree: "Bachelor of Science" },
  { title: "Secondary Education", code: "BSED", defaultDegree: "Bachelor of Secondary Education" },
  { title: "Elementary Education", code: "BEED", defaultDegree: "Bachelor of Elementary Education" },
  { title: "Mechanical Engineering", code: "BSME", defaultDegree: "Bachelor of Science" },
  { title: "Electrical Engineering", code: "BSEE", defaultDegree: "Bachelor of Science" },
  { title: "Criminology", code: "BSCrim", defaultDegree: "Bachelor of Science" },
  { title: "Architecture", code: "BSArch", defaultDegree: "Bachelor of Science" },
  { title: "Medical Technology", code: "BSMT", defaultDegree: "Bachelor of Science" },
  { title: "Pharmacy", code: "BSPharma", defaultDegree: "Bachelor of Science" },
  { title: "Tourism Management", code: "BSTM", defaultDegree: "Bachelor of Science" },
  { title: "Communication", code: "BAComm", defaultDegree: "Bachelor of Arts" },
  { title: "Political Science", code: "BAPS", defaultDegree: "Bachelor of Arts" },
  { title: "English", code: "BAEng", defaultDegree: "Bachelor of Arts" },
  { title: "Industrial Engineering", code: "BSIE", defaultDegree: "Bachelor of Science" },
  { title: "Computer Engineering", code: "BSCpE", defaultDegree: "Bachelor of Science" },
  { title: "Electronics Engineering", code: "BSECE", defaultDegree: "Bachelor of Science" }
];

const COMMON_MAJORS = [
  "Web Development",
  "Software Engineering",
  "Network & Cybersecurity",
  "Data Analytics & AI",
  "Financial Management",
  "Marketing Management",
  "Human Resource Management",
  "Operations Management",
  "Health Informatics",
  "Structural Engineering",
  "Game Development",
  "Digital Media & Graphics"
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase().trim() || "";

  let filteredPrograms = COMMON_PROGRAMS;
  if (query) {
    filteredPrograms = COMMON_PROGRAMS.filter(
      (p) => p.title.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({
    success: true,
    degreeLevels: DEGREE_LEVELS,
    programs: filteredPrograms,
    majors: COMMON_MAJORS,
  });
}
