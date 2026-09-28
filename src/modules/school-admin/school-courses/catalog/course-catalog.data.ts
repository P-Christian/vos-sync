import type { CourseDegree } from "@/modules/school-admin/types/school-admin.types";

export interface CatalogProgram {
  readonly title: string;
  readonly degree: CourseDegree;
  readonly code: string;
}

export interface CatalogCategory {
  readonly name: string;
  readonly programs: readonly CatalogProgram[];
}

export const COURSE_CATALOG_VERSION = "2026.09.28";

export const COURSE_CATALOG: readonly CatalogCategory[] = [
  {
    name: "Information Technology & Computer Science",
    programs: [
      { title: "Bachelor of Science in Computer Science", degree: "Bachelor", code: "BSCS" },
      { title: "Bachelor of Science in Information Technology", degree: "Bachelor", code: "BSIT" },
      { title: "Bachelor of Science in Information Systems", degree: "Bachelor", code: "BSIS" },
      { title: "Bachelor of Science in Computer Engineering", degree: "Bachelor", code: "BSCpE" },
      { title: "Associate in Computer Technology", degree: "Associate", code: "ACT" },
      { title: "Master of Science in Computer Science", degree: "Master", code: "MSCS" },
    ],
  },
  {
    name: "Engineering",
    programs: [
      { title: "Bachelor of Science in Civil Engineering", degree: "Bachelor", code: "BSCE" },
      { title: "Bachelor of Science in Mechanical Engineering", degree: "Bachelor", code: "BSME" },
      { title: "Bachelor of Science in Electrical Engineering", degree: "Bachelor", code: "BSEE" },
      { title: "Bachelor of Science in Electronics Engineering", degree: "Bachelor", code: "BSECE" },
      { title: "Bachelor of Science in Industrial Engineering", degree: "Bachelor", code: "BSIE" },
      { title: "Master of Engineering", degree: "Master", code: "MEng" },
    ],
  },
  {
    name: "Business & Management",
    programs: [
      { title: "Bachelor of Science in Business Administration", degree: "Bachelor", code: "BSBA" },
      { title: "Bachelor of Science in Entrepreneurship", degree: "Bachelor", code: "BSEntrep" },
      { title: "Bachelor of Science in Marketing Management", degree: "Bachelor", code: "BSMM" },
      { title: "Bachelor of Science in Operations Management", degree: "Bachelor", code: "BSOM" },
      { title: "Master in Business Administration", degree: "Master", code: "MBA" },
    ],
  },
  {
    name: "Accountancy & Finance",
    programs: [
      { title: "Bachelor of Science in Accountancy", degree: "Bachelor", code: "BSA" },
      { title: "Bachelor of Science in Accounting Information Systems", degree: "Bachelor", code: "BSAIS" },
      { title: "Bachelor of Science in Management Accounting", degree: "Bachelor", code: "BSMA" },
      { title: "Bachelor of Science in Financial Management", degree: "Bachelor", code: "BSFM" },
      { title: "Master in Accountancy", degree: "Master", code: "MAcc" },
    ],
  },
  {
    name: "Education & Teaching",
    programs: [
      { title: "Bachelor of Elementary Education", degree: "Bachelor", code: "BEEd" },
      { title: "Bachelor of Secondary Education", degree: "Bachelor", code: "BSEd" },
      { title: "Bachelor of Physical Education", degree: "Bachelor", code: "BPEd" },
      { title: "Bachelor of Special Needs Education", degree: "Bachelor", code: "BSNEd" },
      { title: "Master of Arts in Education", degree: "Master", code: "MAEd" },
    ],
  },
  {
    name: "Health & Allied Sciences",
    programs: [
      { title: "Bachelor of Science in Medical Technology", degree: "Bachelor", code: "BSMT" },
      { title: "Bachelor of Science in Pharmacy", degree: "Bachelor", code: "BSP" },
      { title: "Bachelor of Science in Physical Therapy", degree: "Bachelor", code: "BSPT" },
      { title: "Bachelor of Science in Radiologic Technology", degree: "Bachelor", code: "BSRT" },
      { title: "Bachelor of Science in Nutrition and Dietetics", degree: "Bachelor", code: "BSND" },
    ],
  },
  {
    name: "Nursing & Midwifery",
    programs: [
      { title: "Bachelor of Science in Nursing", degree: "Bachelor", code: "BSN" },
      { title: "Diploma in Midwifery", degree: "Associate", code: "DM" },
      { title: "Master of Arts in Nursing", degree: "Master", code: "MAN" },
    ],
  },
  {
    name: "Arts, Humanities & Communication",
    programs: [
      { title: "Bachelor of Arts in Communication", degree: "Bachelor", code: "BAComm" },
      { title: "Bachelor of Arts in Journalism", degree: "Bachelor", code: "BAJ" },
      { title: "Bachelor of Arts in English Language", degree: "Bachelor", code: "BAEL" },
      { title: "Bachelor of Arts in Filipino", degree: "Bachelor", code: "BAFil" },
      { title: "Bachelor of Arts in Multimedia Arts", degree: "Bachelor", code: "BAMA" },
    ],
  },
  {
    name: "Social Sciences",
    programs: [
      { title: "Bachelor of Arts in Psychology", degree: "Bachelor", code: "BAPsych" },
      { title: "Bachelor of Arts in Political Science", degree: "Bachelor", code: "BAPolSci" },
      { title: "Bachelor of Arts in Sociology", degree: "Bachelor", code: "BASoc" },
      { title: "Bachelor of Science in Social Work", degree: "Bachelor", code: "BSSW" },
    ],
  },
  {
    name: "Natural Sciences & Mathematics",
    programs: [
      { title: "Bachelor of Science in Biology", degree: "Bachelor", code: "BSBio" },
      { title: "Bachelor of Science in Chemistry", degree: "Bachelor", code: "BSChem" },
      { title: "Bachelor of Science in Physics", degree: "Bachelor", code: "BSPhy" },
      { title: "Bachelor of Science in Mathematics", degree: "Bachelor", code: "BSMath" },
      { title: "Bachelor of Science in Environmental Science", degree: "Bachelor", code: "BSES" },
    ],
  },
  {
    name: "Agriculture & Fisheries",
    programs: [
      { title: "Bachelor of Science in Agriculture", degree: "Bachelor", code: "BSAg" },
      { title: "Bachelor of Science in Agribusiness", degree: "Bachelor", code: "BSAB" },
      { title: "Bachelor of Science in Fisheries", degree: "Bachelor", code: "BSFi" },
      { title: "Bachelor of Science in Forestry", degree: "Bachelor", code: "BSF" },
    ],
  },
  {
    name: "Hospitality & Tourism",
    programs: [
      { title: "Bachelor of Science in Hospitality Management", degree: "Bachelor", code: "BSHM" },
      { title: "Bachelor of Science in Tourism Management", degree: "Bachelor", code: "BSTM" },
      { title: "Associate in Hotel and Restaurant Management", degree: "Associate", code: "AHRM" },
      { title: "Associate in Culinary Arts", degree: "Associate", code: "ACA" },
    ],
  },
  {
    name: "Criminology & Public Safety",
    programs: [
      { title: "Bachelor of Science in Criminology", degree: "Bachelor", code: "BSCrim" },
      { title: "Bachelor of Science in Industrial Security Management", degree: "Bachelor", code: "BSISM" },
    ],
  },
  {
    name: "Architecture & Design",
    programs: [
      { title: "Bachelor of Science in Architecture", degree: "Bachelor", code: "BSArch" },
      { title: "Bachelor of Science in Interior Design", degree: "Bachelor", code: "BSID" },
      { title: "Bachelor of Science in Landscape Architecture", degree: "Bachelor", code: "BSLA" },
    ],
  },
  {
    name: "Law & Public Administration",
    programs: [
      { title: "Juris Doctor", degree: "Doctorate", code: "JD" },
      { title: "Bachelor of Science in Public Administration", degree: "Bachelor", code: "BSPA" },
      { title: "Master in Public Administration", degree: "Master", code: "MPA" },
    ],
  },
];
