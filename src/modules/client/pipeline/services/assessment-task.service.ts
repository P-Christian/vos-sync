// src/modules/client/pipeline/services/assessment-task.service.ts
// Public entry for company assessment-task authoring. The implementation is
// split by concern across sibling modules; this barrel keeps existing
// callers (API routes, editor) unaffected.

export {
  getCompanyAssessmentStage,
  type AssessmentTaskResult,
  type AssessmentTaskServiceError,
  type CompanyAssessmentTaskRow,
  type DirectusTaskPayload,
} from "./assessment-task.store";
export { listCompanyAssessmentTasks } from "./assessment-task.read";
export {
  createCompanyAssessmentTask,
  updateCompanyAssessmentTask,
} from "./assessment-task.write";
export {
  deleteCompanyAssessmentTask,
  reorderCompanyAssessmentTasks,
} from "./assessment-task.order";
