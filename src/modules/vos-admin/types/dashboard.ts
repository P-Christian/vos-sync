// src/modules/vos-admin/types/dashboard.ts

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'NO_DATA';

export interface AdminDashboardKPIs {
  totalUsers: number;
  activeUsers: number;
  pendingVerifications: number;
  pendingCompanyVerifications: number;
  pendingSchoolVerifications: number;
  totalVerifiedSchools: number;
  totalVerifiedCompanies: number;
  geminiHealthStatus: HealthStatus;
  geminiSuccessRate: number;
  geminiAvgLatencyMs: number;
}

export interface VerificationVelocityPoint {
  month: string;
  companies: number;
  schools: number;
  users: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  fill: string;
}

export interface PendingActionItem {
  id: string | number;
  type: 'COMPANY' | 'SCHOOL';
  name: string;
  submittedAt: string | null;
  detail: string;
  reviewUrl: string;
}

export interface AdminDashboardOverviewData {
  kpis: AdminDashboardKPIs;
  velocity: VerificationVelocityPoint[];
  distribution: StatusDistributionItem[];
  pendingActions: PendingActionItem[];
  lastUpdated: string;
}
