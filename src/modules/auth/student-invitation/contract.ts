export const STUDENT_REGISTRATION_PATH = "/student-register";

/** Build the public student-registration link shared with invitation senders. */
export function buildStudentRegistrationLink(
  token: string,
  appUrl?: string
): string {
  const baseUrl = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/u,
    ""
  );
  return `${baseUrl}${STUDENT_REGISTRATION_PATH}?token=${encodeURIComponent(token)}`;
}
