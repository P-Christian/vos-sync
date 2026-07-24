// src/modules/vos-admin/user-management/services/user.service.ts
import { fetchUsersRepo, fetchUserDetailRepo, updateIdentityVerificationStatusRepo } from './user.repo';
import { VsUser, IdentityVerification } from '../types/user.types';

export async function getUserList(
  roleId?: number,
  search?: string,
  page: number = 1,
  limit: number = 10
): Promise<{ users: VsUser[]; total: number }> {
  return fetchUsersRepo(roleId, search, page, limit);
}

export async function getUserDetail(userId: number): Promise<VsUser | null> {
  return fetchUserDetailRepo(userId);
}

export async function reviewIdentityDocument(
  verificationId: number,
  status: 'approved' | 'rejected',
  adminId: number,
  rejectionNote?: string
): Promise<IdentityVerification> {
  return updateIdentityVerificationStatusRepo(verificationId, status, adminId, rejectionNote);
}
