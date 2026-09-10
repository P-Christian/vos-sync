/** Roles that may use the challenge-backed registration flow. */
export const REGISTRATION_ROLES = [
  "CLIENT",
  "FREELANCER",
  "SCH_ADMIN",
] as const;

export type RegistrationRole = (typeof REGISTRATION_ROLES)[number];

/** States persisted by the registration challenge state machine. */
export const REGISTRATION_CHALLENGE_STATUSES = [
  "ACTIVE",
  "VERIFYING",
  "LOCKED",
  "CONSUMED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type RegistrationChallengeStatus =
  (typeof REGISTRATION_CHALLENGE_STATUSES)[number];

export interface ClientProvisioningInput {
  company_name: string;
  industry: string;
  company_size?: string | null;
  company_email?: string | null;
  company_tin?: string | null;
  company_website?: string | null;
  company_phone?: string | null;
  company_province: string;
  company_city: string;
  company_brgy?: string | null;
  marketing_consent?: boolean;
}

export interface FreelancerProvisioningInput {
  user_province?: string | null;
  user_city?: string | null;
  user_brgy?: string | null;
  employment_types?: string[];
  preferred_location?: string | null;
  country?: string;
  skills?: string[];
  marketing_consent?: boolean;
}

export interface SchoolProvisioningInput {
  school_name: string;
  school_type: string;
  school_province: string;
  school_city: string;
  school_brgy?: string | null;
  /**
   * The invitation token is server-derived input once the challenge is
   * created. It is encrypted in the sealed payload and never returned as a
   * readable browser value.
   */
  invitation_token?: string | null;
  /** Resolved by the server from the invitation; never accepted from input. */
  invited_school_id?: number | string | null;
}

export interface SealedUserData {
  user_email: string;
  hash_password: string;
  user_fname: string;
  user_lname: string;
  user_contact: string;
  user_position?: string | null;
}

export interface SealedRegistrationPayloadV1 {
  version: 1;
  challengeId: string;
  role: RegistrationRole;
  email: string;
  issuedAt: number;
  expiresAt: number;
  userData: SealedUserData;
  clientData?: ClientProvisioningInput;
  freelancerData?: FreelancerProvisioningInput;
  schoolData?: SchoolProvisioningInput;
}

export interface RegistrationChallengeRecord {
  challenge_id: string;
  email_normalized: string;
  role: RegistrationRole;
  otp_hmac: string;
  attempts: number;
  max_attempts: number;
  resend_count: number;
  last_sent_at: string;
  expires_at: string;
  payload_digest: string;
  payload_version: number;
  status: RegistrationChallengeStatus;
  state_version: number;
  verification_lease_id?: string | null;
  verification_lease_expires_at?: string | null;
  request_ip_hash?: string | null;
  created_at: string;
  updated_at: string;
  consumed_at?: string | null;
}

export interface CreateChallengeRecordParams {
  challenge_id: string;
  email_normalized: string;
  role: RegistrationRole;
  otp_hmac: string;
  attempts?: number;
  max_attempts?: number;
  resend_count?: number;
  last_sent_at: string;
  expires_at: string;
  payload_digest: string;
  payload_version: number;
  status: RegistrationChallengeStatus;
  state_version: number;
  request_ip_hash?: string | null;
}

export interface InitiateRegistrationResponse {
  ok: true;
  sealedPayload: string;
  role: RegistrationRole;
  emailMasked: string;
  expiresAt: string;
  resendAvailableAt: string;
}

/** Internal initiation result. The route stores challengeId in an HttpOnly cookie. */
export interface InitiateRegistrationResult extends InitiateRegistrationResponse {
  challengeId: string;
}

export interface RegistrationStatusResponse {
  ok: true;
  role: RegistrationRole;
  stage: "ACTIVE" | "VERIFYING" | "TERMINAL";
  status: RegistrationChallengeStatus;
  emailMasked: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
  terminalReason?: string;
}

export interface ResendOtpResponse {
  ok: true;
  sealedPayload: string;
  emailMasked: string;
  expiresAt: string;
  resendAvailableAt: string;
}

export interface EmailCorrectionResponse {
  ok: true;
  sealedPayload: string;
  emailMasked: string;
  expiresAt: string;
  resendAvailableAt: string;
}

export interface SessionTokenResult {
  token: string;
  destination: string;
  user_id: string | number;
  role: string;
  role_id: number;
  role_name: string;
}
