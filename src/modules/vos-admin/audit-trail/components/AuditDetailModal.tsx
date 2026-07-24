// src/modules/vos-admin/audit-trail/components/AuditDetailModal.tsx
"use client";

import React, { useState } from 'react';
import { AuditRecord } from '../types/audit.types';
import { AuditActionBadge } from './AuditActionBadge';
import { AuditStatusBadge } from './AuditStatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Shield, Server, ArrowRight, Code } from 'lucide-react';

interface AuditDetailModalProps {
  record: AuditRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditDetailModal({ record, isOpen, onClose }: AuditDetailModalProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  if (!record) return null;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  // Compute diff object from old_values vs new_values
  const oldVals = record.old_values || {};
  const newVals = record.new_values || {};
  const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

  const diffItems = allKeys.map((key) => {
    const oldV = oldVals[key];
    const newV = newVals[key];
    let status: 'added' | 'removed' | 'changed' | 'unchanged' = 'unchanged';

    if (oldV === undefined && newV !== undefined) status = 'added';
    else if (oldV !== undefined && newV === undefined) status = 'removed';
    else if (JSON.stringify(oldV) !== JSON.stringify(newV)) status = 'changed';

    return {
      key,
      oldVal: oldV !== undefined ? (typeof oldV === 'object' ? JSON.stringify(oldV) : String(oldV)) : null,
      newVal: newV !== undefined ? (typeof newV === 'object' ? JSON.stringify(newV) : String(newV)) : null,
      status,
    };
  }).filter((item) => item.status !== 'unchanged');

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-6">
        <DialogHeader className="border-b dark:border-zinc-800 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800">
                  {record.event_category}
                </Badge>
                <AuditActionBadge action={record.action} />
                <AuditStatusBadge status={record.status} />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {record.event_type}
              </DialogTitle>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded">
              ID: #{record.audit_id}
            </span>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
            <Calendar className="h-3.5 w-3.5" />
            Occurred on {formatDate(record.created_at)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full bg-zinc-100 dark:bg-zinc-800">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="diff" className="text-xs">
              State Diff ({diffItems.length})
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">Raw JSON</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 pt-4">
            {/* Actor Card */}
            <div className="p-4 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/30 dark:border-zinc-800 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" /> Actor Metadata
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground">Actor Name:</span>
                  <p className="font-medium text-foreground">{record.actor_name || record.actor_email || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor Type:</span>
                  <p className="font-medium text-foreground">{record.actor_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor User ID:</span>
                  <p className="font-medium text-foreground font-mono">{record.actor_user_id ? `#${record.actor_user_id}` : "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor Company ID:</span>
                  <p className="font-medium text-foreground font-mono">{record.actor_company_id ? `#${record.actor_company_id}` : "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">IP Address:</span>
                  <p className="font-medium text-foreground font-mono">{record.ip_address || "N/A"}</p>
                </div>
              </div>
              {record.user_agent && (
                <div className="pt-2 border-t dark:border-zinc-800 text-xs">
                  <span className="text-muted-foreground">User Agent:</span>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">{record.user_agent}</p>
                </div>
              )}
            </div>

            {/* Resource & Org Card */}
            <div className="p-4 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/30 dark:border-zinc-800 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" /> Resource & Target
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground">Resource Type:</span>
                  <p className="font-medium text-foreground">{record.resource_type || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Resource ID:</span>
                  <p className="font-medium text-foreground font-mono">{record.resource_id ? `#${record.resource_id}` : "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Org Type:</span>
                  <p className="font-medium text-foreground">{record.organization_type || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Org ID:</span>
                  <p className="font-medium text-foreground font-mono">{record.organization_id ? `#${record.organization_id}` : "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Correlation ID:</span>
                  <p className="font-medium text-foreground font-mono text-[11px]">{record.correlation_id || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Reason Card */}
            {record.reason && (
              <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Reason / Notes
                </h4>
                <p className="text-xs text-amber-900 dark:text-amber-200">{record.reason}</p>
              </div>
            )}
          </TabsContent>

          {/* Diff Tab */}
          <TabsContent value="diff" className="pt-4">
            {diffItems.length === 0 ? (
              <div className="p-8 text-center border rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30">
                <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-muted-foreground">No state changes recorded for this event.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {diffItems.map((item) => {
                  let bg = "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800";
                  let badgeColor = "bg-zinc-200 text-zinc-800";

                  if (item.status === 'added') {
                    bg = "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50";
                    badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
                  } else if (item.status === 'removed') {
                    bg = "bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50";
                    badgeColor = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                  } else if (item.status === 'changed') {
                    bg = "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50";
                    badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
                  }

                  return (
                    <div key={item.key} className={`p-3 rounded-xl border ${bg} text-xs`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-foreground">{item.key}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${badgeColor}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-white dark:bg-zinc-900 p-2.5 rounded-lg border dark:border-zinc-800">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-sans">Old Value</span>
                          <p className="text-red-600 dark:text-red-400 break-all">{item.oldVal ?? "<none>"}</p>
                        </div>
                        <div className="space-y-0.5 sm:border-l sm:pl-2 dark:border-zinc-800">
                          <span className="text-[10px] text-muted-foreground uppercase font-sans flex items-center gap-1">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" /> New Value
                          </span>
                          <p className="text-emerald-600 dark:text-emerald-400 break-all">{item.newVal ?? "<none>"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Raw JSON Tab */}
          <TabsContent value="raw" className="pt-4">
            <div className="p-4 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs max-h-[400px] overflow-auto">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] text-zinc-400 font-sans">
                <span className="flex items-center gap-1"><Code className="h-3.5 w-3.5" /> Full Event Payload</span>
                <span>JSON</span>
              </div>
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
