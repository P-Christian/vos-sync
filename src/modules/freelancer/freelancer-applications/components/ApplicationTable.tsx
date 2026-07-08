"use client";

import React from 'react';
import { ApplicationItem, ApplicationStatus } from '../types';
import { MoreVertical, CheckCircle, Calendar, Eye, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  applications: ApplicationItem[];
}

const statusConfig: Record<ApplicationStatus, { label: string; icon: React.ElementType; className: string; style?: React.CSSProperties }> = {
  Offer: {
    label: 'Offer',
    icon: CheckCircle,
    className: 'border-transparent',
    style: { backgroundColor: '#16a34a', color: '#fff' }, // hardcoded green
  },
  Interviewing: {
    label: 'Interviewing',
    icon: Calendar,
    className: 'bg-primary/15 text-primary border-transparent',
  },
  'Under Review': {
    label: 'Under Review',
    icon: Eye,
    className: 'bg-secondary text-secondary-foreground border-transparent',
  },
  Applied: {
    label: 'Applied',
    icon: Clock,
    className: 'bg-secondary text-muted-foreground border-transparent',
  },
};

const StatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
      style={config.style}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

export const ApplicationTable: React.FC<Props> = ({ applications }) => {
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
              <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-foreground">{app.jobTitle}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{app.jobType} • {app.location}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {app.companyLogoInitial}
                    </div>
                    <span className="text-sm text-foreground">{app.companyName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{app.dateApplied}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={app.status} />
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
          Showing 1 to {applications.length} of 34 entries
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-xs" disabled>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon-xs" className="bg-primary text-primary-foreground hover:bg-primary/90">1</Button>
          <Button variant="outline" size="icon-xs">2</Button>
          <Button variant="outline" size="icon-xs">3</Button>
          <Button variant="outline" size="icon-xs">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
