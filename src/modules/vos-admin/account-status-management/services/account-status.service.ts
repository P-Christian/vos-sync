// src/modules/vos-admin/account-status-management/services/account-status.service.ts
import { fetchAccountStatusUsersRepo, fetchUserStatusDetailRepo, updateUserStatusRepo, updateAppealCaseRepo } from './account-status.repo';
import { AccountStatusUser } from '../types/account-status.types';

export async function getAccountStatusUsers(
  statusFilter?: string,
  search?: string,
  page: number = 1,
  limit: number = 10
): Promise<{ users: AccountStatusUser[]; total: number }> {
  return fetchAccountStatusUsersRepo(statusFilter, search, page, limit);
}

export async function getAccountStatusDetail(userId: number): Promise<AccountStatusUser | null> {
  return fetchUserStatusDetailRepo(userId);
}

export async function changeUserStatus(
  userId: number,
  newStatus: string,
  newVersion: number,
  adminEmail: string,
  reasonCode: string,
  publicReason: string,
  internalNote?: string,
  expiresAt?: string | null,
  restrictionsToApply?: string[]
): Promise<boolean> {
  return updateUserStatusRepo(
    userId,
    newStatus,
    newVersion,
    adminEmail,
    reasonCode,
    publicReason,
    internalNote,
    expiresAt,
    restrictionsToApply
  );
}

export async function resolveAppeal(
  caseId: number,
  userId: number,
  decision: 'uphold' | 'modify' | 'restore',
  adminEmail: string,
  internalNote?: string,
  publicNote?: string
): Promise<boolean> {
  return updateAppealCaseRepo(caseId, userId, decision, adminEmail, internalNote, publicNote);
}
