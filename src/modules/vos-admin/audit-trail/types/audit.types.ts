// src/modules/vos-admin/audit-trail/types/audit.types.ts

export type AuditStatus = 'SUCCESS' | 'FAILED' | 'DENIED';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'VERIFY' 
  | 'REJECT' 
  | 'EXPORT' 
  | 'SUBMIT' 
  | 'PUBLISH';

export type AuditActorType = 'USER' | 'ADMIN' | 'SERVICE' | 'SYSTEM';

export type AuditCategory = 
  | 'AUTHENTICATION' 
  | 'USER' 
  | 'COMPANY' 
  | 'SCHOOL' 
  | 'JOB' 
  | 'APPLICATION' 
  | 'MESSAGE' 
  | 'NOTIFICATION' 
  | 'ADMIN' 
  | 'SYSTEM';

export type OrgType = 'EMPLOYER' | 'FREELANCER' | 'SCHOOL' | 'PLATFORM';

export interface AuditRecord {
  audit_id: number;
  event_type: string;
  event_category: AuditCategory;
  action: AuditAction;
  status: AuditStatus;
  actor_type: AuditActorType;
  actor_user_id: number | null;
  actor_company_id: number | null;
  // Dynamic resolved actor info
  actor_name?: string | null;
  actor_email?: string | null;
  resource_type: string | null;
  resource_id: string | null;
  organization_type: OrgType | null;
  organization_id: number | null;
  reason: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  correlation_id: string | null;
  created_at: string;
}

export interface AuditFilters {
  search?: string;
  event_category?: string;
  action?: string;
  status?: string;
  actor_type?: string;
  organization_type?: string;
  resource_type?: string;
  actor_user_id?: number;
  date_from?: string;
  date_to?: string;
  page: number;
  limit: number;
}

export interface AuditKPIData {
  todayEvents: number;
  failedEvents: number;
  deniedAccess: number;
  adminActions: number;
}
