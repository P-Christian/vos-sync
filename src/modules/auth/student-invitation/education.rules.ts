export function toEducationUserId(userId: string | number): number | null {
  const parsed = typeof userId === "number" ? userId : Number(userId);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
