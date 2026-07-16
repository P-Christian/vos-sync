"use client";

import React from 'react';
import { ApplicationItem, ApplicationStatus, STATUS_LABELS } from '../types';
import { MoreVertical, CheckCircle, Calendar, Star, Clock, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  applications: ApplicationItem[];
}

type StatusConfigEntry = { icon: React.ElementType; className: string; style?: React.CSSProperties };

const statusConfig: Record<ApplicationStatus, StatusConfigEntry> = {
  APPLIED: {
    icon: Clock,
    className: 'bg-secondary text-muted-foreground border-transparent',
  },
  SHORTLISTED: {
    icon: Star,
    className: 'bg-blue-50 text-blue-700 border-transparent dark:bg-blue-950/30 dark:text-blue-300',
  },
  INTERVIEW_SCHEDULED: {
    icon: Calendar,
    className: 'bg-primary/15 text-primary border-transparent',
  },
  HIRED: {
    icon: CheckCircle,
    className: 'border-transparent',
    style: { backgroundColor: '#16a34a', color: '#fff' },
  },
  REJECTED: {
    icon: XCircle,
    className: 'bg-rose-50 text-rose-600 border-transparent dark:bg-rose-950/30 dark:text-rose-400',
  },
};

const StatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const config = statusConfig[status] ?? statusConfig.APPLIED;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
      style={config.style}
    >
      <Icon className="w-3.5 h-3.5" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const ApplicationTable: React.FC<Props> = ({ applications }) => {
  if (applications.length === 0) {
    return (
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden mb-6 flex flex-col items-center justify-center py-16 gap-3">
        <div className="text-muted-foreground text-sm">No applications found.</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-4">Job Title</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Date Applied</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {applications.map((app) => (
              <tr key={app.application_id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-foreground">{app.job_title ?? '—'}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[app.job_type, app.job_location].filter(Boolean).join(' • ')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {getInitials(app.company_name)}
                    </div>
                    <span className="text-sm text-foreground">{app.company_name ?? '—'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {formatDate(app.applied_at)}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={app.application_status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Showing {applications.length} application{applications.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-xs" disabled>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon-xs" className="bg-primary text-primary-foreground hover:bg-primary/90">1</Button>
          <Button variant="outline" size="icon-xs" disabled>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
