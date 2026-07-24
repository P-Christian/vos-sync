// src/modules/vos-admin/audit-trail/components/AuditTrailPage.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuditTrail } from '../hooks/useAuditTrail';
import { AuditFilters as AuditFiltersType, AuditRecord } from '../types/audit.types';
import { AuditKPICards } from './AuditKPICards';
import { AuditFilters } from './AuditFilters';
import { AuditTable } from './AuditTable';
import { AuditDetailModal } from './AuditDetailModal';
import { AuditSettingsModal } from './AuditSettingsModal';
import { Card } from '@/components/ui/card';
import { ShieldCheck, AlertCircle } from 'lucide-react';

const DEFAULT_FILTERS: AuditFiltersType = {
  search: '',
  event_category: 'ALL',
  action: 'ALL',
  status: 'ALL',
  actor_type: 'ALL',
  organization_type: 'ALL',
  resource_type: '',
  date_from: '',
  date_to: '',
  page: 1,
  limit: 25,
};

export function AuditTrailPage() {
  const { records, total, kpis, config, loading, error, fetchAuditLogs, fetchAuditConfig, saveAuditConfig, exportCSV } = useAuditTrail();
  const [filters, setFilters] = useState<AuditFiltersType>(DEFAULT_FILTERS);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(() => {
    fetchAuditLogs(filters);
  }, [fetchAuditLogs, filters]);

  useEffect(() => {
    loadData();
    fetchAuditConfig();
  }, [loadData, fetchAuditConfig]);

  const handleFilterChange = (newFilters: Partial<AuditFiltersType>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    await exportCSV(filters);
    setIsExporting(false);
  };

  const handleViewRecord = (record: AuditRecord) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  return (
    <div className="h-full flex-1 overflow-y-auto p-4 sm:p-8 bg-secondary/10">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Admin Audit Trail</h1>
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Centralized immutable security and operational event record store for governance and forensic analysis.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <AuditKPICards kpis={kpis} loading={loading} />

      {/* Main Content Card */}
      <Card className="p-6 bg-white dark:bg-zinc-900 border dark:border-zinc-800 shadow-sm rounded-xl">
        {/* Filter Bar */}
        <AuditFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          onExportCSV={handleExportCSV}
          onOpenSettings={() => setSettingsOpen(true)}
          isExporting={isExporting}
        />

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Audit Table */}
        <AuditTable
          records={records}
          total={total}
          loading={loading}
          page={filters.page}
          limit={filters.limit}
          onPageChange={(newPage) => handleFilterChange({ page: newPage })}
          onLimitChange={(newLimit) => handleFilterChange({ limit: newLimit, page: 1 })}
          onViewRecord={handleViewRecord}
        />
      </Card>

      {/* Audit Detail Modal */}
      <AuditDetailModal
        record={selectedRecord}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedRecord(null);
        }}
      />

      {/* Audit Settings Customization Modal */}
      <AuditSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={saveAuditConfig}
      />
    </div>
  );
}

export default AuditTrailPage;

