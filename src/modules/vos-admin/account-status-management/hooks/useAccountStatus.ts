// src/modules/vos-admin/account-status-management/hooks/useAccountStatus.ts
"use client";

import { useState, useCallback } from 'react';
import { AccountStatusUser, AccountStatus, StatusTransitionPayload, AppealDecisionPayload } from '../types/account-status.types';

export function useAccountStatus() {
  const [users, setUsers] = useState<AccountStatusUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (
    statusFilter?: string,
    search?: string,
    page: number = 1,
    limit: number = 10
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') params.append('statusFilter', statusFilter);
      if (search && search.trim()) params.append('search', search.trim());
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetch(`/api/vos-admin/account-status?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch account status users');

      setUsers(json.users ?? []);
      setTotal(json.total ?? 0);
    } catch (err: unknown) {
      setError((err as Error).message);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserDetail = useCallback(async (userId: number): Promise<AccountStatusUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vos-admin/account-status?userId=${userId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch user status details');
      return json.user;
    } catch (err: unknown) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const changeStatus = useCallback(async (payload: StatusTransitionPayload): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/vos-admin/account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update account status');
      return true;
    } catch (err: unknown) {
      setError((err as Error).message);
      return false;
    }
  }, []);

  const resolveAppealCase = useCallback(async (payload: AppealDecisionPayload & { userId: number }): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/vos-admin/account-status/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to resolve appeal case');
      return true;
    } catch (err: unknown) {
      setError((err as Error).message);
      return false;
    }
  }, []);

  return {
    users,
    total,
    loading,
    error,
    fetchUsers,
    fetchUserDetail,
    changeStatus,
    resolveAppealCase,
  };
}
