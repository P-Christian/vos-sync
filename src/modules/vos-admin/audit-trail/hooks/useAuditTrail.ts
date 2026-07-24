// src/modules/vos-admin/audit-trail/hooks/useAuditTrail.ts
"use client";

import { useState, useCallback } from 'react';
import { AuditRecord, AuditFilters, AuditKPIData, AuditCategoryConfig, DEFAULT_AUDIT_CONFIG } from '../types/audit.types';

export function useAuditTrail() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<AuditKPIData>({
    todayEvents: 0,
    failedEvents: 0,
    deniedAccess: 0,
    adminActions: 0,
  });
  const [config, setConfig] = useState<AuditCategoryConfig>(DEFAULT_AUDIT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async (filters: AuditFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(filters.page));
      params.append('limit', String(filters.limit));

      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.event_category && filters.event_category !== 'ALL') params.append('event_category', filters.event_category);
      if (filters.action && filters.action !== 'ALL') params.append('action', filters.action);
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.actor_type && filters.actor_type !== 'ALL') params.append('actor_type', filters.actor_type);
      if (filters.organization_type && filters.organization_type !== 'ALL') params.append('organization_type', filters.organization_type);
      if (filters.resource_type?.trim()) params.append('resource_type', filters.resource_type.trim());
      if (filters.actor_user_id) params.append('actor_user_id', String(filters.actor_user_id));
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await fetch(`/api/vos-admin/audit-trail?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch audit logs');

      setRecords(json.records ?? []);
      setTotal(json.total ?? 0);
      if (json.kpis) {
        setKpis(json.kpis);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/vos-admin/audit-trail/config');
      const json = await res.json();
      if (res.ok && json.config) {
        setConfig(json.config);
      }
    } catch (err: unknown) {
      console.warn("Failed to load audit config:", err);
    }
  }, []);

  const saveAuditConfig = useCallback(async (newConfig: AuditCategoryConfig): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/vos-admin/audit-trail/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save audit settings');

      if (json.config) {
        setConfig(json.config);
      }
      return true;
    } catch (err: unknown) {
      setError((err as Error).message);
      return false;
    }
  }, []);

  const exportCSV = useCallback(async (filters: AuditFilters) => {
    try {
      const params = new URLSearchParams();
      params.append('export', 'csv');

      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.event_category && filters.event_category !== 'ALL') params.append('event_category', filters.event_category);
      if (filters.action && filters.action !== 'ALL') params.append('action', filters.action);
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.actor_type && filters.actor_type !== 'ALL') params.append('actor_type', filters.actor_type);
      if (filters.organization_type && filters.organization_type !== 'ALL') params.append('organization_type', filters.organization_type);
      if (filters.resource_type?.trim()) params.append('resource_type', filters.resource_type.trim());
      if (filters.actor_user_id) params.append('actor_user_id', String(filters.actor_user_id));
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await fetch(`/api/vos-admin/audit-trail?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to export audit CSV');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }, []);

  return {
    records,
    total,
    kpis,
    config,
    loading,
    error,
    fetchAuditLogs,
    fetchAuditConfig,
    saveAuditConfig,
    exportCSV,
  };
}

