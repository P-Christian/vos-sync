// src/modules/vos-admin/audit-trail/hooks/useAuditTrail.ts
"use client";

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
      params.append('export', 'csv'); // Keep asking backend for CSV to avoid backend rewrites

      // Cleanly append filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'ALL' && value !== '') {
          const formattedValue = typeof value === 'string' ? value.trim() : String(value);
          if (formattedValue && key !== 'page' && key !== 'limit') {
            params.append(key, formattedValue);
          }
        }
      });

      const res = await fetch(`/api/vos-admin/audit-trail?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to export audit data');

      // 1. Get the raw CSV text from the backend
      const blob = await res.blob();
      const csvText = await blob.text();

      // 2. Parse the CSV text into a SheetJS Workbook
      const workbook = XLSX.read(csvText, { type: 'string', raw: true });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];

      // 3. Define auto-fitted column widths based on your screenshot
      worksheet['!cols'] = [
        { wch: 10 },  // A: Audit ID
        { wch: 22 },  // B: Timestamp
        { wch: 20 },  // C: Category
        { wch: 25 },  // D: Event Type
        { wch: 15 },  // E: Action
        { wch: 15 },  // F: Status
        { wch: 15 },  // G: Actor Type
        { wch: 15 },  // H: Actor User ID
        { wch: 25 },  // I: Actor Name
        { wch: 20 },  // J: Resource (Type)
        { wch: 15 },  // K: Resource ID
        { wch: 25 },  // L: Organization
        { wch: 70 },  // M: Reason (Made extra wide for log descriptions)
        { wch: 20 },  // N: IP Address
        { wch: 40 },  // O: Correlation ID
      ];

      // 4. Generate and download the .xlsx file
      const fileName = `audit_trail_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during export.');
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
    exportCSV, // Make sure to update this in your component UI as well!
  };
}