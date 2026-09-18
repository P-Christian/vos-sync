import { z } from "zod";
import { validatePasswordStrict } from "@/lib/password-validation";

/**
 * Keep browser payloads deliberately small. This is a validation guard, not
 * a replacement for the request-body limit enforced by the route handler.
 */
export const MAX_SEALED_PAYLOAD_LENGTH = 32_768;
export const MAX_CAPTCHA_TOKEN_LENGTH = 4_096;

/** Normalize an email once, before it is used for any lookup or persistence. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Normalize user contact data without changing meaningful phone characters. */
export function normalizeContact(contact: string): string {
  return contact.trim().replace(/\s+/gu, " ");
}

/** Normalize human-readable location/name values consistently. */
export function normalizeLocation(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function normalizeOptionalText(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;
  const normalized = normalizeLocation(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalToken(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCaptchaToken(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

const requiredText = (message: string, max: number) =>
  z
    .string({ message })
    .trim()
    .min(1, message)
    .max(max, `${message.replace(/ is required\.$/u, "")} is too long.`)
    .transform(normalizeLocation);

const optionalText = (max: number) =>
  z.preprocess(
    normalizeOptionalText,
    z.string().max(max).nullable().optional()
  );

const optionalToken = z.preprocess(
  normalizeOptionalToken,
  z.string().max(4_096).nullable().optional()
);

const captchaToken = z.preprocess(
  normalizeCaptchaToken,
  z.string().max(MAX_CAPTCHA_TOKEN_LENGTH).optional()
);

const emailInput = z
  .string({ message: "Email address is required." })
  .trim()
  .email("Invalid email address.")
  .max(320, "Email address is too long.")
  .transform(normalizeEmail);

const contactInput = z
  .string({ message: "Contact number is required." })
  .trim()
  .min(7, "Contact number is too short.")
  .max(50, "Contact number is too long.")
  .transform(normalizeContact);

const passwordInput = z
  .string({ message: "Password is required." })
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password is too long.")
  .refine(
    validatePasswordStrict,
    "Password must include uppercase, lowercase, number, and special character."
  );

const baseUserFields = {
  user_fname: requiredText("First name is required.", 100),
  user_lname: requiredText("Last name is required.", 100),
  email: emailInput,
  user_contact: contactInput,
  password: passwordInput,
  confirmPassword: z.string({
    message: "Password confirmation is required.",
  }),
  // Consent is required independently of optional marketing consent.
  terms_accepted: z.literal(true, {
    message: "You must accept the Terms and Conditions to register.",
  }),
  privacy_accepted: z.literal(true, {
    message: "You must accept the Privacy Policy to register.",
  }),
  // These aliases are accepted at the boundary and are never sealed.
  turnstileToken: captchaToken,
  "cf-turnstile-response": captchaToken,
};

const passwordMatchesConfirmation = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) =>
  schema.refine((data) => {
    const values = data as { password: string; confirmPassword: string };
    return values.password === values.confirmPassword;
  }, {
    message: "Password and confirmation do not match.",
    path: ["confirmPassword"],
  });

export const clientRegistrationInputSchema = passwordMatchesConfirmation(
  z
    .object({
      role: z.literal("CLIENT"),
      ...baseUserFields,
      user_position: optionalText(100),
      company_name: requiredText("Company name is required.", 255),
      industry: requiredText("Industry is required.", 100),
      company_province: requiredText("Province is required.", 100),
      company_city: requiredText("City is required.", 100),
      company_brgy: optionalText(100),
      company_size: optionalText(50),
      company_email: z.preprocess(
        normalizeOptionalToken,
        z
          .string()
          .email("Invalid company email.")
          .max(320)
          .transform(normalizeEmail)
          .nullable()
          .optional()
      ),
      // TIN is sensitive but can be accepted here; it is only carried inside
      // the authenticated sealed payload and is never put in readable storage.
      company_tin: optionalText(50),
      company_website: optionalText(255),
      company_phone: optionalText(50),
      marketing_consent: z.boolean().optional().default(false),
    })
    .strict()
);

const listItem = z
  .string()
  .trim()
  .min(1, "List values cannot be empty.")
  .max(100, "List values cannot exceed 100 characters.")
  .transform(normalizeLocation);

const canonicalList = z
  .array(listItem)
  .max(100, "Too many list values.")
  .transform((values) => [...new Set(values)]);

const freelancerSkills = z.preprocess(
  (value) => (typeof value === "string" ? (value.trim() ? [value] : []) : value),
  canonicalList.optional().default([])
);

export const freelancerRegistrationInputSchema = passwordMatchesConfirmation(
  z
    .object({
      role: z.literal("FREELANCER"),
      ...baseUserFields,
      jobTitle: optionalText(100),
      province: optionalText(100),
      city: optionalText(100),
      barangay: optionalText(100),
      street: optionalText(255),
      country: z
        .string()
        .trim()
        .min(1, "Country cannot be empty.")
        .max(100, "Country is too long.")
        .transform(normalizeLocation)
        .default("Philippines"),
      employmentTypes: canonicalList.optional().default([]),
      skills: freelancerSkills,
      marketing_consent: z.boolean().optional().default(false),
    })
    .strict()
);

export const schoolRegistrationInputSchema = passwordMatchesConfirmation(
  z
    .object({
      role: z.literal("SCH_ADMIN"),
      ...baseUserFields,
      school_name: requiredText("School name is required.", 255),
      school_type: requiredText("School type is required.", 100),
      province: requiredText("Province is required.", 100),
      city_municipality: requiredText("City/Municipality is required.", 100),
      barangay: optionalText(100),
      // Invitation tokens are accepted only as input to the server. They are
      // not readable browser state and are not treated as a school/user ID.
      token: optionalToken,
    })
    .strict()
);

export const registrationInputUnionSchema = z.discriminatedUnion("role", [
  clientRegistrationInputSchema,
  freelancerRegistrationInputSchema,
  schoolRegistrationInputSchema,
]);

export type ClientRegistrationInput = z.infer<
  typeof clientRegistrationInputSchema
>;
export type FreelancerRegistrationInput = z.infer<
  typeof freelancerRegistrationInputSchema
>;
export type SchoolRegistrationInput = z.infer<
  typeof schoolRegistrationInputSchema
>;
export type RegistrationInput = z.infer<typeof registrationInputUnionSchema>;

/*
 * The sealed payload is an internal, server-produced contract. Keep a
 * separate schema instead of reusing browser input schemas: it contains only
 * a password hash and server-derived provisioning input.
 */
const sealedEmailSchema = z
  .string()
  .email("Invalid sealed email address.")
  .max(320)
  .refine(
    (value) => value === normalizeEmail(value),
    "Sealed email is not canonical."
  );

const canonicalSealedText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(
      (value) => value === normalizeLocation(value),
      "Sealed value is not canonical."
    );

const sealedNullableText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .refine(
      (value) =>
        value === null ||
        value === undefined ||
        value === normalizeLocation(value),
      "Sealed value is not canonical."
    );

const sealedUserDataSchema = z
  .object({
    user_email: sealedEmailSchema,
    // bcrypt hashes are generated before sealing. The schema intentionally
    // does not hard-code a cost/version so credential migrations can rotate
    // the hash format without changing this payload version.
    hash_password: z.string().min(1).max(255),
    user_fname: canonicalSealedText(100),
    user_lname: canonicalSealedText(100),
    user_contact: canonicalSealedText(50),
    user_position: sealedNullableText(100),
  })
  .strict();

const sealedClientDataSchema = z
  .object({
    company_name: canonicalSealedText(255),
    industry: canonicalSealedText(100),
    company_size: sealedNullableText(50),
    company_email: sealedEmailSchema.nullable().optional(),
    company_tin: sealedNullableText(50),
    company_website: sealedNullableText(255),
    company_phone: sealedNullableText(50),
    company_province: canonicalSealedText(100),
    company_city: canonicalSealedText(100),
    company_brgy: sealedNullableText(100),
    marketing_consent: z.boolean(),
  })
  .strict();

const sealedFreelancerDataSchema = z
  .object({
    user_province: sealedNullableText(100),
    user_city: sealedNullableText(100),
    user_brgy: sealedNullableText(400),
    employment_types: canonicalList.optional(),
    preferred_location: sealedNullableText(400),
    country: canonicalSealedText(100).optional(),
    skills: canonicalList.optional(),
    marketing_consent: z.boolean(),
  })
  .strict();

const sealedSchoolDataSchema = z
  .object({
    school_name: canonicalSealedText(255),
    school_type: canonicalSealedText(100),
    school_province: canonicalSealedText(100),
    school_city: canonicalSealedText(100),
    school_brgy: sealedNullableText(100),
    invitation_token: z.string().max(4_096).nullable().optional(),
    // This field, when present, is resolved by the server from the
    // invitation. It is never accepted in browser registration input.
    invited_school_id: z
      .union([z.number().int().positive(), z.string().min(1).max(100)])
      .nullable()
      .optional(),
  })
  .strict();

const sealedPayloadBase = {
  version: z.literal(1),
  challengeId: z.string().uuid(),
  email: sealedEmailSchema,
  issuedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  expiresAt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  userData: sealedUserDataSchema,
};

const sealedClientPayloadSchema = z
  .object({
    ...sealedPayloadBase,
    role: z.literal("CLIENT"),
    clientData: sealedClientDataSchema,
  })
  .strict();

const sealedFreelancerPayloadSchema = z
  .object({
    ...sealedPayloadBase,
    role: z.literal("FREELANCER"),
    freelancerData: sealedFreelancerDataSchema,
  })
  .strict();

const sealedSchoolPayloadSchema = z
  .object({
    ...sealedPayloadBase,
    role: z.literal("SCH_ADMIN"),
    schoolData: sealedSchoolDataSchema,
  })
  .strict();

export const sealedRegistrationPayloadSchema = z
  .discriminatedUnion("role", [
    sealedClientPayloadSchema,
    sealedFreelancerPayloadSchema,
    sealedSchoolPayloadSchema,
  ])
  .superRefine((payload, ctx) => {
    if (payload.expiresAt <= payload.issuedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Sealed payload expiry must be after issue time.",
      });
    }

    if (payload.userData.user_email !== payload.email) {
      ctx.addIssue({
        code: "custom",
        path: ["userData", "user_email"],
        message: "Sealed user email does not match payload email.",
      });
    }
  });

export type SealedRegistrationPayload = z.infer<
  typeof sealedRegistrationPayloadSchema
>;

export const emailCorrectionInputSchema = z
  .object({
    newEmail: emailInput,
    sealedPayload: z
      .string({ message: "Sealed payload is required." })
      .min(1)
      .max(MAX_SEALED_PAYLOAD_LENGTH),
    turnstileToken: captchaToken,
    "cf-turnstile-response": captchaToken,
  })
  .strict();

export type EmailCorrectionInput = z.infer<typeof emailCorrectionInputSchema>;

export const resendOtpInputSchema = z
  .object({
    sealedPayload: z
      .string({ message: "Sealed payload is required." })
      .min(1)
      .max(MAX_SEALED_PAYLOAD_LENGTH),
  })
  .strict();

export type ResendOtpInput = z.infer<typeof resendOtpInputSchema>;

export const verifyOtpInputSchema = z
  .object({
    otp: z
      .string({ message: "Verification code is required." })
      .trim()
      .regex(/^\d{6}$/u, "Verification code must be exactly 6 digits."),
    sealedPayload: z
      .string({ message: "Sealed payload is required." })
      .min(1)
      .max(MAX_SEALED_PAYLOAD_LENGTH),
  })
  .strict();

export type VerifyOtpInput = z.infer<typeof verifyOtpInputSchema>;
