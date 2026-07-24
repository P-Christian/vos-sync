// src/modules/vos-admin/audit-trail/components/AuditSettingsModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { AuditCategoryConfig, DEFAULT_GRANULAR_AUDIT_CONFIG } from '../types/audit.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SlidersHorizontal, ShieldCheck, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AuditCategoryConfig;
  onSaveConfig: (newConfig: AuditCategoryConfig) => Promise<boolean>;
}

interface ActionItem {
  actionKey: string;
  label: string;
}

interface CategoryGroup {
  categoryKey: string;
  categoryTitle: string;
  actions: ActionItem[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    categoryKey: 'AUTHENTICATION',
    categoryTitle: 'Authentication',
    actions: [
      { actionKey: 'LOGIN', label: 'Login' },
      { actionKey: 'LOGOUT', label: 'Logout' },
      { actionKey: 'OTP_VERIFY', label: 'OTP Verification' },
      { actionKey: 'PASSWORD_RESET', label: 'Password Reset' },
      { actionKey: 'ACCOUNT_RECOVERY', label: 'Account Recovery' },
      { actionKey: 'FAILED_LOGIN', label: 'Failed Login' },
      { actionKey: 'LOCKOUT', label: 'Lockouts' },
    ],
  },
  {
    categoryKey: 'USER',
    categoryTitle: 'User Management',
    actions: [
      { actionKey: 'CREATE', label: 'User Created' },
      { actionKey: 'UPDATE', label: 'User Updated' },
      { actionKey: 'DELETE', label: 'User Deleted' },
      { actionKey: 'ROLE_ASSIGN', label: 'Role Assigned' },
      { actionKey: 'ROLE_REVOKE', label: 'Role Revoked' },
      { actionKey: 'PERMISSION_CHANGE', label: 'Permission Changed' },
    ],
  },
  {
    categoryKey: 'COMPANY',
    categoryTitle: 'Company Verification',
    actions: [
      { actionKey: 'SUBMIT', label: 'Company Submitted' },
      { actionKey: 'VERIFY', label: 'Company Verified' },
      { actionKey: 'REJECT', label: 'Company Rejected' },
      { actionKey: 'DOC_UPLOAD', label: 'Documents Uploaded' },
      { actionKey: 'DOC_DELETE', label: 'Documents Deleted' },
      { actionKey: 'OVERRIDE', label: 'Verification Override' },
    ],
  },
  {
    categoryKey: 'EMPLOYEE',
    categoryTitle: 'Employee Actions',
    actions: [
      { actionKey: 'CREATE', label: 'Employee Created' },
      { actionKey: 'UPDATE', label: 'Employee Updated' },
      { actionKey: 'DELETE', label: 'Employee Deleted' },
      { actionKey: 'PUBLISH', label: 'Profile Published' },
    ],
  },
  {
    categoryKey: 'SCHOOL',
    categoryTitle: 'School Actions',
    actions: [
      { actionKey: 'REGISTER', label: 'School Registered' },
      { actionKey: 'VERIFY', label: 'School Verified' },
      { actionKey: 'COURSES_MODIFIED', label: 'Courses Modified' },
    ],
  },
  {
    categoryKey: 'JOB',
    categoryTitle: 'Job Module',
    actions: [
      { actionKey: 'POST', label: 'Job Posted' },
      { actionKey: 'EDIT', label: 'Job Edited' },
      { actionKey: 'CLOSE', label: 'Job Closed' },
      { actionKey: 'DELETE', label: 'Job Deleted' },
    ],
  },
  {
    categoryKey: 'APPLICATION',
    categoryTitle: 'Application Module',
    actions: [
      { actionKey: 'SUBMIT', label: 'Application Submitted' },
      { actionKey: 'STATUS_CHANGE', label: 'Status Changed' },
      { actionKey: 'SCHEDULE', label: 'Interview Scheduled' },
      { actionKey: 'OFFER_SENT', label: 'Offer Sent' },
      { actionKey: 'REJECT', label: 'Rejected' },
    ],
  },
  {
    categoryKey: 'ADMIN',
    categoryTitle: 'Administrative',
    actions: [
      { actionKey: 'EXPORT', label: 'Export' },
      { actionKey: 'SEARCH', label: 'Search' },
      { actionKey: 'VIEW_AUDIT', label: 'View Audit' },
      { actionKey: 'RETENTION_CHANGE', label: 'Retention Changes' },
      { actionKey: 'LEGAL_HOLD', label: 'Legal Hold' },
      { actionKey: 'CONFIG_CHANGE', label: 'Configuration Changes' },
    ],
  },
];

export function AuditSettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}: AuditSettingsModalProps) {
  const [localConfig, setLocalConfig] = useState<AuditCategoryConfig>(config);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    AUTHENTICATION: true, // Default expand Authentication
  });
  const [saving, setSaving] = useState(false);

  const prevIsOpenRef = React.useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      Promise.resolve().then(() => {
        setLocalConfig(config && config.categories && config.actions ? config : DEFAULT_GRANULAR_AUDIT_CONFIG);
      });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, config]);

  const toggleAccordion = (categoryKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const handleMasterCategoryToggle = (categoryKey: string, checked: boolean) => {
    setLocalConfig((prev) => {
      const nextCategories = { ...(prev.categories || {}), [categoryKey]: checked };
      const nextActions = { ...(prev.actions || {}) };

      // Also set all action toggles inside this category to checked state
      const categoryGroup = CATEGORY_GROUPS.find((g) => g.categoryKey === categoryKey);
      if (categoryGroup) {
        const catActions = { ...(nextActions[categoryKey] || {}) };
        categoryGroup.actions.forEach((act) => {
          catActions[act.actionKey] = checked;
        });
        nextActions[categoryKey] = catActions;
      }

      return {
        categories: nextCategories,
        actions: nextActions,
      };
    });
  };

  const handleActionToggle = (categoryKey: string, actionKey: string, checked: boolean) => {
    setLocalConfig((prev) => {
      const catActions = { ...(prev.actions?.[categoryKey] || {}), [actionKey]: checked };
      const nextActions = { ...(prev.actions || {}), [categoryKey]: catActions };

      // If at least one action is enabled, keep category enabled; if all disabled, set category false
      const hasAnyEnabled = Object.values(catActions).some((val) => val === true);
      const nextCategories = { ...(prev.categories || {}), [categoryKey]: hasAnyEnabled };

      return {
        categories: nextCategories,
        actions: nextActions,
      };
    });
  };

  const handleEnableAll = () => {
    setLocalConfig(DEFAULT_GRANULAR_AUDIT_CONFIG);
  };

  const handleDisableAll = () => {
    const disabledCategories: Record<string, boolean> = {};
    const disabledActions: Record<string, Record<string, boolean>> = {};

    CATEGORY_GROUPS.forEach((group) => {
      disabledCategories[group.categoryKey] = false;
      disabledActions[group.categoryKey] = {};
      group.actions.forEach((act) => {
        disabledActions[group.categoryKey][act.actionKey] = false;
      });
    });

    setLocalConfig({
      categories: disabledCategories,
      actions: disabledActions,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onSaveConfig(localConfig);
    setSaving(false);
    if (success) {
      onClose();
    }
  };

  const getEnabledCount = (group: CategoryGroup): { enabled: number; total: number } => {
    const total = group.actions.length;
    const catActions = localConfig.actions?.[group.categoryKey] || {};
    const isCategoryMasterOn = localConfig.categories?.[group.categoryKey] !== false;

    let enabled = 0;
    group.actions.forEach((act) => {
      if (isCategoryMasterOn && catActions[act.actionKey] !== false) {
        enabled++;
      }
    });

    return { enabled, total };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-6">
        <DialogHeader className="border-b dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl font-bold tracking-tight">
              Audit Event Customization Settings
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Toggle entire business categories or expand dropdowns to customize individual event actions.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Action Buttons */}
        <div className="flex items-center justify-between py-2 border-b dark:border-zinc-800">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Event Categories & Individual Actions
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={handleEnableAll}
              className="text-xs h-7 gap-1"
            >
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Enable All
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={handleDisableAll}
              className="text-xs h-7 gap-1"
            >
              <XCircle className="h-3.5 w-3.5 text-red-600" /> Disable All
            </Button>
          </div>
        </div>

        {/* Category Accordion List */}
        <div className="space-y-3 py-2">
          {CATEGORY_GROUPS.map((group) => {
            const isExpanded = !!expandedCategories[group.categoryKey];
            const isCategoryMasterOn = localConfig.categories?.[group.categoryKey] !== false;
            const { enabled, total } = getEnabledCount(group);

            return (
              <div
                key={group.categoryKey}
                className="rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/40 dark:border-zinc-800 overflow-hidden"
              >
                {/* Accordion Header */}
                <div className="flex items-center justify-between p-3.5 bg-zinc-100/60 dark:bg-zinc-800/60 border-b dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(group.categoryKey)}
                    className="flex items-center gap-2.5 text-left flex-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-bold text-foreground">
                      {group.categoryTitle}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${enabled > 0 ? 'bg-primary/10 text-primary' : 'bg-zinc-200 dark:bg-zinc-800 text-muted-foreground'}`}>
                      {enabled}/{total} ON
                    </span>
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Category Switch:</span>
                    <Switch
                      checked={isCategoryMasterOn}
                      onCheckedChange={(val) => handleMasterCategoryToggle(group.categoryKey, val)}
                    />
                  </div>
                </div>

                {/* Accordion Content: Action Items */}
                {isExpanded && (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-zinc-900/60">
                    {group.actions.map((act) => {
                      const isActionChecked = isCategoryMasterOn && (localConfig.actions?.[group.categoryKey]?.[act.actionKey] !== false);
                      return (
                        <div
                          key={act.actionKey}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-zinc-50/40 dark:bg-zinc-800/20 dark:border-zinc-800"
                        >
                          <span className="text-xs font-medium text-foreground">{act.label}</span>
                          <Switch
                            checked={isActionChecked}
                            disabled={!isCategoryMasterOn}
                            onCheckedChange={(val) => handleActionToggle(group.categoryKey, act.actionKey, val)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t dark:border-zinc-800 pt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving} className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            {saving ? "Saving..." : "Save Audit Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
