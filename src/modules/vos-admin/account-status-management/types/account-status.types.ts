// src/modules/vos-admin/account-status-management/types/account-status.types.ts

export type AccountStatus =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'LIMITED'
  | 'SUSPENDED'
  | 'BLOCKED'
  | 'DEACTIVATED'
  | 'PENDING_DELETION'
  | 'DELETED';

export interface AccountRestriction {
  restriction_id: number;
  user_id: number;
  code: string;
  scope_type?: string | null;
  scope_id?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  effective_at: string;
  expires_at?: string | null;
  reason?: string | null;
  source?: string | null;
}

export interface AccountStatusHistory {
  history_id: number;
  user_id: number;
  prior_status?: AccountStatus | null;
  new_status: AccountStatus;
  prior_version?: number | null;
  new_version: number;
  actor?: string | null;
  approver?: string | null;
  reason?: string | null;
  policy_version?: string | null;
  occurred_at: string;
}

export interface AccountStatusCase {
  case_id: number;
  user_id: number;
  type: string;
  state: 'OPEN' | 'ASSIGNED' | 'RESOLVED';
  assigned_reviewer?: number | null;
  evidence_refs?: string | null;
  statement?: string | null;
  public_decision?: string | null;
  internal_decision?: string | null;
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
}

export interface AccountDeletionRequest {
  request_id: number;
  user_id: number;
  requested_at: string;
  due_at: string;
  cancelled_at?: string | null;
  completed_at?: string | null;
  hold_state?: boolean | number | null;
  retention_state?: string | null;
  result_category?: string | null;
}

export interface AccountStatusUser {
  user_id: number;
  user_email: string;
  user_fname: string;
  user_lname: string;
  role: string;
  role_id: number | null;
  status: AccountStatus;
  status_version: number;
  session_epoch?: string | null;
  restrictions?: AccountRestriction[];
  cases?: AccountStatusCase[];
  history?: AccountStatusHistory[];
  deletionRequest?: AccountDeletionRequest | null;
}

export interface StatusTransitionPayload {
  userId: number;
  targetStatus: AccountStatus;
  reasonCode: string;
  publicReason: string;
  internalNote?: string;
  expiresAt?: string | null;
  restrictions?: string[]; // Array of restriction codes to apply (if LIMITED)
}

export interface AppealDecisionPayload {
  caseId: number;
  decision: 'uphold' | 'modify' | 'restore';
  internalNote?: string;
  publicNote?: string;
}
