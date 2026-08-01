export interface PasswordRequirements {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

/**
  Checks a password string against standard security requirements:
  - Minimum 8 characters
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one digit (0-9)
  - At least one special symbol ([^A-Za-z0-9])
 */
export function checkPasswordRequirements(password: string): PasswordRequirements {
  const p = password || "";
  return {
    minLength: p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    lowercase: /[a-z]/.test(p),
    number: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  };
}

/**
  Returns true if and only if all 5 password requirements are satisfied.
 */
export function validatePasswordStrict(password: string): boolean {
  const reqs = checkPasswordRequirements(password);
  return Object.values(reqs).every(Boolean);
}
