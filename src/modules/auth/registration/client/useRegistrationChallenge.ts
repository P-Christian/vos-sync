"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelRegistration,
  correctRegistrationEmail,
  getRegistrationStatus,
  initiateRegistration,
  isRegistrationApiError,
  RegistrationApiError,
  resendRegistrationOtp,
  verifyRegistrationOtp,
  type CancelRegistrationResponse,
  type VerifyRegistrationResponse,
} from "./registration.api";
import type {
  InitiateRegistrationResponse,
  RegistrationRole,
  RegistrationStatusResponse,
  ResendOtpResponse,
  EmailCorrectionResponse,
} from "../registration.types";
import type { RegistrationInput } from "../registration.schemas";
import {
  clearRegistrationStorage,
  loadRegistrationPayload,
  readRegistrationStorage,
  saveRegistrationDraft,
  saveRegistrationPayload,
  type RegistrationDraft,
  type RegistrationDraftInput,
} from "./registration.storage";

export type RegistrationChallengePhase =
  | "idle"
  | "recovering"
  | "active"
  | "verifying"
  | "terminal"
  | "success"
  | "error";

export interface UseRegistrationChallengeOptions {
  /** Reject a saved challenge created for a different signup role. */
  expectedRole?: RegistrationRole;
  /** Set false when a screen wants to invoke recover() itself. */
  autoRecover?: boolean;
  onSuccess?: (result: VerifyRegistrationResponse) => void;
}

export interface RegistrationChallengeState {
  phase: RegistrationChallengePhase;
  status: RegistrationStatusResponse | null;
  role: RegistrationRole | null;
  sealedPayload: string | null;
  emailMasked: string | null;
  expiresAt: string | null;
  resendAvailableAt: string | null;
  attemptsRemaining: number | null;
  draft: RegistrationDraft | null;
  error: RegistrationApiError | null;
  /** True only for a malformed/unsupported value found in either storage key. */
  storageCorrupted: boolean;
}

export interface UseRegistrationChallengeResult
  extends RegistrationChallengeState {
  isLoading: boolean;
  isActive: boolean;
  isVerifying: boolean;
  isTerminal: boolean;
  hasChallenge: boolean;
  recover: () => Promise<RegistrationStatusResponse | null>;
  initiate: (
    input: RegistrationInput,
    draft?: RegistrationDraftInput
  ) => Promise<InitiateRegistrationResponse>;
  resend: () => Promise<ResendOtpResponse>;
  correctEmail: (
    newEmail: string,
    turnstileToken?: string
  ) => Promise<EmailCorrectionResponse>;
  verify: (otp: string) => Promise<VerifyRegistrationResponse>;
  cancel: () => Promise<CancelRegistrationResponse>;
  setDraft: (draft: RegistrationDraftInput) => RegistrationDraft | null;
  clear: () => void;
}

const EMPTY_STATE: RegistrationChallengeState = {
  phase: "idle",
  status: null,
  role: null,
  sealedPayload: null,
  emailMasked: null,
  expiresAt: null,
  resendAvailableAt: null,
  attemptsRemaining: null,
  draft: null,
  error: null,
  storageCorrupted: false,
};

const TERMINAL_ERROR_CODES = new Set([
  "CHALLENGE_NOT_FOUND",
  "CHALLENGE_EXPIRED",
  "CHALLENGE_LOCKED",
  "CHALLENGE_CONSUMED",
  "CHALLENGE_CANCELLED",
  "PAYLOAD_INVALID",
  "MAIL_DELIVERY_FAILED",
  "COMPANY_EMAIL_CONFLICT",
  "COMPANY_TIN_CONFLICT",
]);

function asApiError(error: unknown): RegistrationApiError {
  if (isRegistrationApiError(error)) return error;
  return new RegistrationApiError(
    "PROVISIONING_FAILED",
    "Registration could not be completed. Please try again."
  );
}

function shouldClearForError(error: RegistrationApiError): boolean {
  return TERMINAL_ERROR_CODES.has(error.code);
}

function safeDraftFromInput(input: RegistrationInput): RegistrationDraftInput {
  // Keep this mapping explicit.  In particular, do not pass the form object
  // through to storage: it contains a password, contact/location fields,
  // consent tokens, and (for school signup) an invitation token.
  const source = input as unknown as Record<string, unknown>;
  const asString = (value: unknown): string | undefined =>
    typeof value === "string" ? value : undefined;
  return {
    role: source.role as RegistrationRole | undefined,
    firstName: asString(source.user_fname),
    lastName: asString(source.user_lname),
    email: asString(source.email ?? source.user_email),
    companyName: asString(source.company_name),
    schoolName: asString(source.school_name),
  };
}

function stateFromStatus(
  status: RegistrationStatusResponse,
  sealedPayload: string,
  draft: RegistrationDraft | null
): RegistrationChallengeState {
  const isTerminal = status.stage === "TERMINAL";
  return {
    phase: isTerminal
      ? "terminal"
      : status.stage === "VERIFYING"
        ? "verifying"
        : "active",
    status,
    role: status.role,
    sealedPayload,
    emailMasked: status.emailMasked,
    expiresAt: status.expiresAt,
    resendAvailableAt: status.resendAvailableAt,
    attemptsRemaining: status.attemptsRemaining,
    draft,
    error: null,
    storageCorrupted: false,
  };
}

/**
 * Shared browser lifecycle for all three challenge-backed registration roles.
 * The server status response is authoritative; local storage is only a
 * recovery aid and never authorizes verification by itself.
 */
export function useRegistrationChallenge(
  options: UseRegistrationChallengeOptions = {}
): UseRegistrationChallengeResult {
  const { expectedRole, autoRecover = true, onSuccess } = options;
  const [state, setState] = useState(EMPTY_STATE);
  const mountedRef = useRef(true);
  const operationRef = useRef(0);
  const payloadRef = useRef<string | null>(null);

  const beginOperation = useCallback(() => {
    operationRef.current += 1;
    return operationRef.current;
  }, []);

  const commit = useCallback(
    (
      operationId: number,
      updater: (current: RegistrationChallengeState) => RegistrationChallengeState
    ) => {
      if (!mountedRef.current || operationRef.current !== operationId) return;
      setState(updater);
    },
    []
  );

  const recover = useCallback(async (): Promise<RegistrationStatusResponse | null> => {
    const operationId = beginOperation();
    const stored = readRegistrationStorage();
    payloadRef.current = stored.sealedPayload;

    commit(operationId, (current) => ({
      ...current,
      phase: "recovering",
      error: null,
      draft: stored.draft,
      storageCorrupted: stored.corrupted,
    }));

    try {
      const status = await getRegistrationStatus();

      if (status.stage === "TERMINAL") {
        clearRegistrationStorage();
        payloadRef.current = null;
        commit(operationId, () => ({
          ...stateFromStatus(status, "", stored.draft),
          sealedPayload: null,
          draft: null,
        }));
        return status;
      }

      if (stored.corrupted) {
        clearRegistrationStorage();
        payloadRef.current = null;
        const error = new RegistrationApiError(
          "PAYLOAD_INVALID",
          "Your saved registration session is no longer valid. Please start again."
        );
        commit(operationId, () => ({
          ...EMPTY_STATE,
          phase: "error",
          error,
          storageCorrupted: true,
        }));
        return null;
      }

      if (
        (expectedRole && status.role !== expectedRole) ||
        (stored.draft?.role && stored.draft.role !== status.role)
      ) {
        clearRegistrationStorage();
        payloadRef.current = null;
        const error = new RegistrationApiError(
          "PAYLOAD_INVALID",
          "This saved registration belongs to a different role. Please start again."
        );
        commit(operationId, () => ({
          ...EMPTY_STATE,
          phase: "error",
          error,
        }));
        return null;
      }

      if (!stored.sealedPayload) {
        clearRegistrationStorage();
        payloadRef.current = null;
        const error = new RegistrationApiError(
          "PAYLOAD_INVALID",
          "Your registration session cannot be recovered. Please start again."
        );
        commit(operationId, () => ({
          ...EMPTY_STATE,
          phase: "error",
          error,
        }));
        return null;
      }

      commit(operationId, () =>
        stateFromStatus(status, stored.sealedPayload as string, stored.draft)
      );
      return status;
    } catch (caughtError) {
      const error = asApiError(caughtError);
      if (shouldClearForError(error)) {
        clearRegistrationStorage();
        payloadRef.current = null;
      }

      // A missing cookie is the normal first visit to signup, not a visible
      // registration error.  Other failures remain available to the caller.
      if (error.code === "CHALLENGE_NOT_FOUND") {
        commit(operationId, () => ({ ...EMPTY_STATE, draft: stored.draft }));
      } else {
        commit(operationId, (current) => ({
          ...current,
          phase: "error",
          error,
          sealedPayload: shouldClearForError(error)
            ? null
            : current.sealedPayload,
        }));
      }
      return null;
    }
  }, [beginOperation, commit, expectedRole]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoRecover) void recover();
    return () => {
      mountedRef.current = false;
    };
  }, [autoRecover, recover]);

  const initiate = useCallback(
    async (
      input: RegistrationInput,
      draftInput?: RegistrationDraftInput
    ): Promise<InitiateRegistrationResponse> => {
      const operationId = beginOperation();
      commit(operationId, (current) => ({
        ...current,
        phase: "recovering",
        error: null,
        storageCorrupted: false,
      }));

      try {
        const response = await initiateRegistration(input);
        const payloadSaved = saveRegistrationPayload(response.sealedPayload);
        const draft = saveRegistrationDraft(
          draftInput ?? safeDraftFromInput(input)
        );
        payloadRef.current = response.sealedPayload;

        commit(operationId, () => ({
          ...EMPTY_STATE,
          phase: "active",
          role: response.role,
          sealedPayload: response.sealedPayload,
          emailMasked: response.emailMasked,
          expiresAt: response.expiresAt,
          resendAvailableAt: response.resendAvailableAt,
          draft,
          // A private-mode browser may reject sessionStorage.  Keep the
          // challenge usable for the current page lifetime, but expose the
          // storage failure to callers through the error field.
          error: payloadSaved
            ? null
            : new RegistrationApiError(
                "PROVISIONING_FAILED",
                "Registration started, but this browser could not save recovery state."
              ),
        }));
        return response;
      } catch (caughtError) {
        const error = asApiError(caughtError);
        if (shouldClearForError(error)) {
          clearRegistrationStorage();
          payloadRef.current = null;
        }
        commit(operationId, (current) => ({
          ...current,
          phase: "error",
          error,
        }));
        throw error;
      }
    },
    [beginOperation, commit]
  );

  const resend = useCallback(async (): Promise<ResendOtpResponse> => {
    const operationId = beginOperation();
    const currentPayload = payloadRef.current ?? loadRegistrationPayload();
    if (!currentPayload) {
      const error = new RegistrationApiError("PAYLOAD_INVALID");
      clearRegistrationStorage();
      payloadRef.current = null;
      commit(operationId, () => ({ ...EMPTY_STATE, phase: "error", error }));
      throw error;
    }

    commit(operationId, (current) => ({
      ...current,
      phase: "recovering",
      error: null,
    }));

    try {
      const response = await resendRegistrationOtp(currentPayload);
      if (!saveRegistrationPayload(response.sealedPayload)) {
        throw new RegistrationApiError(
          "PROVISIONING_FAILED",
          "The new verification code could not be saved in this browser."
        );
      }
      payloadRef.current = response.sealedPayload;
      commit(operationId, (current) => ({
        ...current,
        phase: "active",
        sealedPayload: response.sealedPayload,
        emailMasked: response.emailMasked,
        expiresAt: response.expiresAt,
        resendAvailableAt: response.resendAvailableAt,
        // The resend contract resets attempts server-side but does not
        // expose a count; avoid presenting the old count as authoritative.
        attemptsRemaining: null,
        error: null,
      }));
      return response;
    } catch (caughtError) {
      const error = asApiError(caughtError);
      if (shouldClearForError(error)) {
        clearRegistrationStorage();
        payloadRef.current = null;
      }
      commit(operationId, (current) => ({
        ...current,
        phase:
          error.code === "PROVISIONING_IN_PROGRESS" ? "verifying" : "error",
        error,
      }));
      throw error;
    }
  }, [beginOperation, commit]);

  const correctEmail = useCallback(
    async (
      newEmail: string,
      turnstileToken?: string
    ): Promise<EmailCorrectionResponse> => {
      const operationId = beginOperation();
      const currentPayload = payloadRef.current ?? loadRegistrationPayload();
      if (!currentPayload) {
        const error = new RegistrationApiError("PAYLOAD_INVALID");
        clearRegistrationStorage();
        payloadRef.current = null;
        commit(operationId, () => ({ ...EMPTY_STATE, phase: "error", error }));
        throw error;
      }

      commit(operationId, (current) => ({
        ...current,
        phase: "recovering",
        error: null,
      }));

      try {
        const response = await correctRegistrationEmail(
          newEmail,
          currentPayload,
          turnstileToken
        );
        if (!saveRegistrationPayload(response.sealedPayload)) {
          throw new RegistrationApiError(
            "PROVISIONING_FAILED",
            "The updated registration session could not be saved in this browser."
          );
        }
        payloadRef.current = response.sealedPayload;

        const currentDraft = readRegistrationStorage().draft;
        const updatedDraft = saveRegistrationDraft({
          ...(currentDraft ?? {}),
          email: newEmail,
        });
        commit(operationId, (current) => ({
          ...current,
          phase: "active",
          sealedPayload: response.sealedPayload,
          emailMasked: response.emailMasked,
          expiresAt: response.expiresAt,
          resendAvailableAt: response.resendAvailableAt,
          attemptsRemaining: null,
          draft: updatedDraft ?? current.draft,
          error: null,
        }));
        return response;
      } catch (caughtError) {
        const error = asApiError(caughtError);
        if (shouldClearForError(error)) {
          clearRegistrationStorage();
          payloadRef.current = null;
        }
        commit(operationId, (current) => ({
          ...current,
          phase: error.code === "PROVISIONING_IN_PROGRESS" ? "verifying" : "error",
          error,
        }));
        throw error;
      }
    },
    [beginOperation, commit]
  );

  const verify = useCallback(
    async (otp: string): Promise<VerifyRegistrationResponse> => {
      const operationId = beginOperation();
      const currentPayload = payloadRef.current ?? loadRegistrationPayload();
      if (!currentPayload) {
        const error = new RegistrationApiError("PAYLOAD_INVALID");
        clearRegistrationStorage();
        payloadRef.current = null;
        commit(operationId, () => ({ ...EMPTY_STATE, phase: "error", error }));
        throw error;
      }

      commit(operationId, (current) => ({
        ...current,
        phase: "verifying",
        error: null,
      }));

      let response: VerifyRegistrationResponse;
      try {
        response = await verifyRegistrationOtp(otp, currentPayload);
      } catch (caughtError) {
        const error = asApiError(caughtError);
        if (shouldClearForError(error)) {
          clearRegistrationStorage();
          payloadRef.current = null;
        }
        commit(operationId, (current) => ({
          ...current,
          phase:
            error.code === "PROVISIONING_IN_PROGRESS" ? "verifying" : "active",
          attemptsRemaining:
            error.remainingAttempts ?? current.attemptsRemaining,
          error,
          sealedPayload: shouldClearForError(error)
            ? null
            : current.sealedPayload,
        }));
        throw error;
      }

      clearRegistrationStorage();
      payloadRef.current = null;
      commit(operationId, () => ({
        ...EMPTY_STATE,
        phase: "success",
        role: response.role,
        error: null,
      }));
      // A consumer callback must not turn a committed server verification
      // into a false provisioning failure if its own UI code throws.
      try {
        onSuccess?.(response);
      } catch {
        // Deliberately ignored; the registration commit already succeeded.
      }
      return response;
    },
    [beginOperation, commit, onSuccess]
  );

  const cancel = useCallback(async (): Promise<CancelRegistrationResponse> => {
    const operationId = beginOperation();
    try {
      const response = await cancelRegistration();
      clearRegistrationStorage();
      payloadRef.current = null;
      commit(operationId, () => ({ ...EMPTY_STATE, phase: "terminal" }));
      return response;
    } catch (caughtError) {
      const error = asApiError(caughtError);
      if (shouldClearForError(error)) {
        clearRegistrationStorage();
        payloadRef.current = null;
      }
      commit(operationId, (current) => ({
        ...current,
        phase: "error",
        error,
      }));
      throw error;
    }
  }, [beginOperation, commit]);

  const setDraft = useCallback(
    (draftInput: RegistrationDraftInput): RegistrationDraft | null => {
      const draft = saveRegistrationDraft(draftInput);
      if (mountedRef.current) {
        setState((current) => ({ ...current, draft }));
      }
      return draft;
    },
    []
  );

  const clear = useCallback(() => {
    beginOperation();
    clearRegistrationStorage();
    payloadRef.current = null;
    if (mountedRef.current) setState({ ...EMPTY_STATE });
  }, [beginOperation]);

  return {
    ...state,
    isLoading: state.phase === "recovering" || state.phase === "verifying",
    isActive: state.phase === "active",
    isVerifying: state.phase === "verifying",
    isTerminal: state.phase === "terminal" || state.phase === "success",
    hasChallenge: state.sealedPayload !== null,
    recover,
    initiate,
    resend,
    correctEmail,
    verify,
    cancel,
    setDraft,
    clear,
  };
}
