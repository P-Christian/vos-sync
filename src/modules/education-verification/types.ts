import "server-only";

export type CourseRequestConsumer = "vos" | "school";
export type RosterClassification = "alumni" | "current";

export type EnsureAttendanceRosterInput = {
  readonly educationId: number;
  readonly schoolId: number;
  readonly courseId: number | null;
  readonly approvalDate: string;
  readonly studentNumber?: string | null;
  readonly gpa?: number | null;
  readonly schoolYear?: string | null;
};

export type AttendanceEvidenceInput = {
  readonly educationId: number;
  readonly schoolId: number;
};

export type CompleteAttendanceRosterCourseInput = {
  readonly educationId: number;
  readonly schoolId: number;
  readonly courseId: number;
};

export type SchoolAttendanceReconciliation = {
  readonly mode: "schoolAttendance";
  readonly educationId: number;
  readonly requesterId: number;
  readonly canonicalSchoolId: number;
  readonly expectedRawSchoolName: string | null;
  readonly canonicalCourseId: number | null;
};

export type CourseCompletionReconciliation = {
  readonly mode: "courseCompletion";
  readonly educationId: number;
  readonly requesterId: number;
  readonly canonicalSchoolId: number;
  readonly canonicalCourseId: number;
};

export type ReconcileLinkedEducationInput =
  | SchoolAttendanceReconciliation
  | CourseCompletionReconciliation;

export type ClaimCourseRequestInput = {
  readonly requestId: number;
  readonly consumer: CourseRequestConsumer;
  readonly reviewerId: number;
  readonly courseId: number;
};

export type FinalizeCourseRequestInput =
  | {
      readonly requestId: number;
      readonly consumer: CourseRequestConsumer;
      readonly action: "Approved";
      readonly courseId: number;
    }
  | {
      readonly requestId: number;
      readonly consumer: CourseRequestConsumer;
      readonly action: "Rejected";
      readonly reviewerId: number;
      readonly remarks: string;
    }
  | {
      readonly requestId: number;
      readonly consumer: "vos";
      readonly action: "RoutedToSchool";
      readonly reviewerId: number;
    };

export type EnsureCourseRequestInput = {
  readonly educationId: number;
  readonly schoolId: number;
  readonly requestedCourseName: string;
};

export type RouteCourseRequestInput = {
  readonly courseRequestId: number;
  readonly schoolId: number;
  readonly routedBy: number;
  readonly routedAt: string;
};
