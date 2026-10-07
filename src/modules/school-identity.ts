export function normalizeSchoolIdentity(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

export function schoolIdentitiesMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeSchoolIdentity(left);
  return (
    normalizedLeft.length > 0 &&
    normalizedLeft === normalizeSchoolIdentity(right)
  );
  
}
