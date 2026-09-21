export function generateSchoolYearOptions(currentYear?: number): string[] {
  const baseYear = currentYear || new Date().getFullYear();
  const options: string[] = [];

  // Generate range: 2 years prior up to 3 years ahead
  for (let i = -2; i <= 3; i++) {
    const startYear = baseYear + i;
    const endYear = startYear + 1;
    options.push(`${startYear}-${endYear}`);
  }

  return options;
}
