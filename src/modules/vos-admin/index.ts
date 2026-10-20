export { SchoolAdminDashboard } from './components/SchoolAdminDashboard';
export * from './types/dashboard';
export * from './hooks/useAdminDashboardData';
export * from './account-status-management';
export * from './school-verification';
export {
  CompanyVerificationModule,
  type CompanyDocument,
  type CompanyUser,
  type CompanyVerificationAttempt,
  type CompanyVerificationRecord,
  type CompanyVerificationFilters,
  type CompanyVerificationKPIs,
  type VerificationDecisionPayload as CompanyVerificationDecisionPayload,
  type VerificationStatus as CompanyVerificationStatus,
} from './company-verification';
export { CareerAdviceManagementPage } from './career-advice-management';
export type { CareerArticle, ArticleStatus, ArticleAsset, ArticleFilters } from './career-advice-management';
