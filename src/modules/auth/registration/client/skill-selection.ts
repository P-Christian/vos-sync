export interface SelectedSkill {
  id?: number;
  skill_name: string;
}

export function normalizeSkillName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isSameSkill(a: SelectedSkill, b: SelectedSkill): boolean {
  if (typeof a.id === "number" && typeof b.id === "number") {
    return a.id === b.id;
  }
  return normalizeSkillName(a.skill_name) === normalizeSkillName(b.skill_name);
}

export function addSkill(
  current: SelectedSkill[],
  next: SelectedSkill,
  max: number,
): SelectedSkill[] {
  if (current.some((s) => isSameSkill(s, next))) return current;
  if (current.length >= max) return current;
  return [...current, next];
}

export function removeSkill(
  current: SelectedSkill[],
  target: SelectedSkill,
): SelectedSkill[] {
  const idx = current.findIndex((s) => isSameSkill(s, target));
  if (idx === -1) return [...current];
  return [...current.slice(0, idx), ...current.slice(idx + 1)];
}

export function hasExactMatch(
  results: { id: number; skill_name: string }[],
  query: string,
): boolean {
  const normalized = normalizeSkillName(query);
  if (normalized.length === 0) return false;
  return results.some((r) => normalizeSkillName(r.skill_name) === normalized);
}

export function toSkillPayload(selected: SelectedSkill[]): string[] {
  return selected.map((s) => s.skill_name.trim());
}
