import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticateCookieSession,
  isFreelancerSession,
} from "@/lib/authenticated-session";
import type { StudentInvitationErrorCode } from "@/modules/auth/student-invitation/errors";
import {
  completeOwnedAcceptance,
  StudentInvitationAcceptanceError,
} from "@/modules/auth/student-invitation/invitation.acceptance";
import {
  InvitationChallengeError,
  verifyInvitationChallenge,
} from "@/modules/auth/student-invitation/invitation.challenge";
import {
  findInvitationById,
  findInvitationByToken,
  findStudentById,
  linkStudentAccount,
} from "@/modules/auth/student-invitation/invitation.repo";
import {
  getInvitationState,
  isLinkedToSession,
} from "@/modules/auth/student-invitation/invitation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verifySchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9_-]+$/u),
    otp: z.string().trim().regex(/^\d{6}$/u).optional(),
  })
  .strict();
const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;

function verifyJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function conflictJson(code: StudentInvitationErrorCode): NextResponse {
  return verifyJson({ error: "Invitation cannot be accepted.", code }, 409);
}

/** Verify roster-email control, link the account, then consume the invitation. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await authenticateCookieSession();
  if (!session) {
    return verifyJson(
      { error: "Authentication required.", code: "UNAUTHENTICATED" },
      401
    );
  }
  if (!isFreelancerSession(session)) {
    return conflictJson("INVITATION_ROLE_INVALID");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return verifyJson(
      { error: "Invalid request.", code: "INVALID_REQUEST" },
      400
    );
  }
  const input = verifySchema.safeParse(body);
  if (!input.success) {
    return verifyJson(
      { error: "Invalid request.", code: "INVALID_REQUEST" },
      400
    );
  }

  try {
    const invitation = await findInvitationByToken(input.data.token);
    const student = invitation
      ? await findStudentById(invitation.student_id)
      : null;
    if (!invitation || !student || invitation.school_id !== student.school_id) {
      return verifyJson(
        { error: "Invitation cannot be accepted.", code: "INVITATION_INVALID" },
        400
      );
    }

    if (student.registered_user_id !== null) {
      if (!isLinkedToSession(student, session.userId)) {
        return conflictJson("INVITATION_OWNERSHIP_CONFLICT");
      }
      await completeOwnedAcceptance({
        sessionUserId: session.userId,
        invitation,
        student,
      });
      return verifyJson({ state: "linked" });
    }
    if (invitation.is_used) {
      return verifyJson(
        { error: "Invitation cannot be accepted.", code: "INVITATION_USED" },
        400
      );
    }
    const invitationState = getInvitationState(invitation, student, Date.now());
    if (invitationState === "expired") {
      return verifyJson(
        { error: "Invitation cannot be accepted.", code: "INVITATION_EXPIRED" },
        400
      );
    }
    if (invitationState !== "valid") {
      return verifyJson(
        { error: "Invitation cannot be accepted.", code: "INVITATION_INVALID" },
        400
      );
    }

    const accountEmail = session.user.user_email?.trim().toLowerCase();
    const rosterEmail = student.email?.trim().toLowerCase();
    if (!accountEmail || !rosterEmail) {
      return verifyJson(
        {
          error: "Invitation service is unavailable.",
          code: "SERVICE_UNAVAILABLE",
        },
        503
      );
    }
    if (accountEmail !== rosterEmail) {
      if (!input.data.otp) {
        return verifyJson(
          { error: "Invalid verification code.", code: "OTP_REQUIRED" },
          400
        );
      }
      await verifyInvitationChallenge(input.data.otp, {
        invitationId: invitation.invitation_id,
        userId: session.userId,
        email: rosterEmail,
      });
    }

    const [latestInvitation, latestStudent] = await Promise.all([
      findInvitationById(invitation.invitation_id),
      findStudentById(student.student_id),
    ]);
    if (
      !latestInvitation ||
      !latestStudent ||
      latestInvitation.school_id !== latestStudent.school_id
    ) {
      return conflictJson("INVITATION_INVALID");
    }
    if (latestStudent.registered_user_id !== null) {
      if (!isLinkedToSession(latestStudent, session.userId)) {
        return conflictJson("INVITATION_OWNERSHIP_CONFLICT");
      }
      await completeOwnedAcceptance({
        sessionUserId: session.userId,
        invitation: latestInvitation,
        student: latestStudent,
      });
      return verifyJson({ state: "linked" });
    }
    const latestState = getInvitationState(
      latestInvitation,
      latestStudent,
      Date.now()
    );
    if (latestState === "expired") {
      return conflictJson("INVITATION_EXPIRED");
    }
    if (latestState === "used") {
      return conflictJson("INVITATION_USED");
    }
    if (latestState !== "valid") {
      return conflictJson("INVITATION_INVALID");
    }
    const latestEmail = latestStudent.email;
    const latestRosterEmail = latestEmail?.trim().toLowerCase();
    if (
      !latestEmail ||
      !latestRosterEmail ||
      latestRosterEmail !== rosterEmail
    ) {
      return conflictJson("INVITATION_INVALID");
    }

    const link = await linkStudentAccount({
      studentId: latestStudent.student_id,
      userId: session.userId,
      schoolId: latestStudent.school_id,
      rosterEmail: latestEmail,
    });
    if (link.kind === "conflict") {
      return conflictJson("INVITATION_OWNERSHIP_CONFLICT");
    }

    await completeOwnedAcceptance({
      sessionUserId: session.userId,
      invitation: latestInvitation,
      student: link.student,
    });
    return verifyJson({ state: "linked" });
  } catch (error: unknown) {
    if (error instanceof InvitationChallengeError) {
      return verifyJson(
        {
          error: "Invalid verification code.",
          code: error.code,
          ...(error.attemptsRemaining !== undefined
            ? { attemptsRemaining: error.attemptsRemaining }
            : {}),
        },
        error.statusCode
      );
    }
    if (error instanceof StudentInvitationAcceptanceError) {
      return verifyJson(
        {
          error:
            error.statusCode === 503
              ? "Invitation service is unavailable."
              : "Invitation cannot be accepted.",
          code: error.code,
        },
        error.statusCode
      );
    }
    console.error("[student-invitation.verify] Request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return verifyJson(
      {
        error: "Invitation service is unavailable.",
        code: "SERVICE_UNAVAILABLE",
      },
      503
    );
  }
}
