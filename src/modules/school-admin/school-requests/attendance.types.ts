import "server-only";

export type AttendanceAcademics = {
  readonly student_number?: string | number | null;
  readonly gpa?: string | number | null;
  readonly school_year?: string | number | null;
};

export type AttendanceDecisionInput = {
  readonly callerUserId: number;
  readonly requestId: number;
  readonly academics?: AttendanceAcademics;
};

export type AttendanceDecisionResult = {
  readonly requestId: number;
  readonly requestStatus: "Approved";
  readonly educationStatus: "Pending" | "Verified";
  readonly rosterStudentId: number;
  readonly courseRequestId: number | null;
  readonly reviewedBy: number;
  readonly reviewedAt: string;
};

export type AttendanceRejectionInput = {
  readonly callerUserId: number;
  readonly requestId: number;
  readonly remarks: string;
};

export type AttendanceRejectionResult = {
  readonly requestId: number;
  readonly requestStatus: "Rejected";
  readonly reviewedBy: number;
  readonly reviewedAt: string;
};
