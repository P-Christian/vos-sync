// src/modules/matching-engine/retrieval/schoolMatcher.ts

import { cleanText } from "../normalizers/textNormalizer";
import { computeTokenOverlapScore } from "./tokenMatcher";
import { computeJaroWinkler } from "./fuzzyMatcher";

export interface SchoolMatchResult {
  matched: boolean;
  score: number;
  reason: string;
}

export const COMMON_SCHOOL_ALIASES: Record<string, string[]> = {
  up: ["university of the philippines"],
  pup: ["polytechnic university of the philippines"],
  dlsu: ["de la salle university", "de la salle", "la salle"],
  lasalle: ["de la salle university", "de la salle"],
  admu: ["ateneo de manila university", "ateneo de manila"],
  ateneo: [
    "ateneo de manila university",
    "ateneo de manila",
    "ateneo de davao university",
    "ateneo de zamboanga university",
    "ateneo de naga university",
    "ateneo",
  ],
  ust: ["university of santo tomas", "santo tomas"],
  feu: ["far eastern university"],
  plm: ["pamantasan ng lungsod ng maynila"],
  tip: ["technological institute of the philippines"],
  tup: ["technological university of the philippines"],
  ceu: ["centro escolar university"],
  ue: ["university of the east"],
  mapua: ["mapua university", "mapua institute of technology"],
  mu: ["mapua university"],
  slu: ["saint louis university"],
  cpu: ["central philippine university"],
  bulsu: ["bulacan state university"],
  cvsu: ["cavite state university"],
  rtu: ["rizal technological university"],
  earist: ["eulogio amang rodriguez institute of science and technology"],
  nu: ["national university"],
  adamson: ["adamson university"],
  adsu: ["adamson university"],
  sbu: ["san beda university", "san beda college"],
  beda: ["san beda university", "san beda college"],
  su: ["silliman university"],
  usc: ["university of san carlos"],
  usjr: ["university of san jose recoletos"],
  cit: ["cebu institute of technology"],
  citu: ["cebu institute of technology university"],
  uc: ["university of cebu"],
  psu: ["pangasinan state university", "palawan state university"],
  wmsu: ["western mindanao state university"],
  msu: ["mindanao state university"],
  clsu: ["central luzon state university"],
  tsu: ["tarlac state university"],
  dhvsu: ["don honorio ventura state university"],
};

export function generateSchoolAcronym(schoolName: string): string {
  if (!schoolName) return "";
  const cleaned = schoolName.replace(/[^a-zA-Z\s]/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return "";
  const stopWords = new Set(["of", "the", "in", "and", "&", "for", "to", "ng"]);
  const acronym = words
    .filter((w) => !stopWords.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join("");
  return acronym.toLowerCase();
}

export function isSchoolQuery(query: string): boolean {
  if (!query) return false;
  const clean = cleanText(query);
  if (!clean) return false;
  if (COMMON_SCHOOL_ALIASES[clean]) return true;
  return /\b(university|college|school|institute|polytechnic|academy|campus|pamantasan|state university)\b/i.test(
    query
  );
}

export function matchSchool(query: string, schoolName: string): SchoolMatchResult {
  const queryClean = cleanText(query);
  const schoolClean = cleanText(schoolName);
  if (!queryClean || !schoolClean) {
    return { matched: false, score: 0, reason: "" };
  }

  // 1. Exact match
  if (queryClean === schoolClean) {
    return { matched: true, score: 95, reason: "SCHOOL_EXACT_MATCH" };
  }

  // 2. Acronym match (dynamic or dictionary)
  const dynamicAcronym = generateSchoolAcronym(schoolName);
  if (
    dynamicAcronym &&
    (queryClean === dynamicAcronym || queryClean.replace(/\s+/g, "") === dynamicAcronym)
  ) {
    return { matched: true, score: 95, reason: "SCHOOL_ACRONYM_MATCH" };
  }

  const aliases = COMMON_SCHOOL_ALIASES[queryClean];
  if (aliases && aliases.some((a) => schoolClean.includes(a) || a.includes(schoolClean))) {
    return { matched: true, score: 95, reason: "SCHOOL_ALIAS_MATCH" };
  }

  // 3. Substring match
  if (queryClean.length >= 3 && schoolClean.includes(queryClean)) {
    return { matched: true, score: 90, reason: "SCHOOL_SUBSTRING_MATCH" };
  }
  if (schoolClean.length >= 4 && queryClean.includes(schoolClean)) {
    return { matched: true, score: 85, reason: "SCHOOL_SUBSTRING_MATCH" };
  }

  // 4. Token overlap
  const overlap = computeTokenOverlapScore(queryClean, schoolClean);
  if (overlap >= 0.6) {
    return { matched: true, score: Math.round(overlap * 85), reason: "SCHOOL_TOKEN_MATCH" };
  }

  // 5. Fuzzy character match (typo tolerance)
  if (queryClean.length >= 4) {
    const jaro = computeJaroWinkler(queryClean, schoolClean);
    if (jaro >= 0.82) {
      return { matched: true, score: Math.round(jaro * 80), reason: "SCHOOL_FUZZY_MATCH" };
    }
  }

  return { matched: false, score: 0, reason: "" };
}
