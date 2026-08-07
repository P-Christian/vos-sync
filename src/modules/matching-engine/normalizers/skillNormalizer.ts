// src/modules/matching-engine/normalizers/skillNormalizer.ts

export function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSkills(skills: string[]): string[] {
  const set = new Set<string>();
  for (const s of skills) {
    if (s && s.trim()) {
      set.add(normalizeSkill(s));
    }
  }
  return Array.from(set);
}
