"use client";

import React, { useState } from 'react';
import { ApplicationItem, ApplicationStatus, STATUS_LABELS, PublicJobPosting } from '../types';
import { CheckCircle, Calendar, Star, Clock, XCircle, MoreVertical, Eye, XOctagon, FileText, Link as LinkIcon, DollarSign, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { JobDetailSheet } from './JobDetailSheet';
import CompanyPreviewModal from './CompanyPreviewModal';
import { CompanyProfile } from '../types';
import { DataTable } from './NewDataTable';
import { ColumnDef } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

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
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [originalJob, setOriginalJob] = useState<PublicJobPosting | null>(null);
  const [isJobSheetOpen, setIsJobSheetOpen] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);

  const handleOpenJobPost = async (jobId: number) => {
    try {
      setLoadingJob(true);
      const res = await fetch("/api/freelancer/jobs");
      if (res.ok) {
        const data = await res.json();
        const jobs: PublicJobPosting[] = data.jobs || [];
        const found = jobs.find(j => j.job_id === jobId);
        if (found) {
          setOriginalJob(found);
          setIsJobSheetOpen(true);
        } else {
          alert("Could not find the original job post. It might have been closed or deleted.");
        }
      } else {
        alert("Failed to load original job post.");
      }
    } catch (err) {
      console.error(err);
      alert("Error loading job post.");
    } finally {
      setLoadingJob(false);
    }
  };

  const handleWithdraw = (app: ApplicationItem) => {
    // Placeholder for withdraw action
    console.log("Withdraw application", app.application_id);
    alert("Withdraw application functionality will be implemented soon.");
  };

  const columns: ColumnDef<ApplicationItem>[] = [
    {
      accessorKey: 'job_title',
      header: 'Job Title',
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div>
            <div className="text-sm font-semibold text-foreground">{app.job_title ?? '—'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {[app.job_type, app.job_location].filter(Boolean).join(' • ')}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'company_name',
      header: 'Company',
      cell: ({ row }) => {
        const app = row.original;
        const isClickable = !!app.company_details;
        return (
          <div 
            className={`flex items-center gap-2.5 ${isClickable ? 'group cursor-pointer' : ''}`}
            onClick={(e) => {
              if (isClickable) {
                e.stopPropagation();
                setSelectedCompany(app.company_details ?? null);
                setIsCompanyOpen(true);
              }
            }}
          >
            <div className={`w-10 h-10 rounded border bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0 overflow-hidden ${isClickable ? 'group-hover:border-primary/50 transition-colors' : ''}`}>
              {app.company_details?.company_logo ? (
                <img 
                  src={app.company_details.company_logo.startsWith("http") ? app.company_details.company_logo : `/api/client/assets/${app.company_details.company_logo}`} 
                  alt={app.company_name ?? ""} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                getInitials(app.company_name)
              )}
            </div>
            <span className={`text-sm text-foreground ${isClickable ? 'group-hover:text-primary group-hover:underline transition-all' : ''}`}>
              {app.company_name ?? '—'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'applied_at',
      header: 'Date Applied',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.applied_at)}
        </span>
      ),
    },
    {
      accessorKey: 'application_status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.application_status} />
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedApp(app)} className="cursor-pointer gap-2">
                  <Eye className="w-4 h-4" />
                  View Application
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleWithdraw(app)} className="cursor-pointer gap-2 text-rose-500 focus:text-rose-500">
                  <XOctagon className="w-4 h-4" />
                  Withdraw Application
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={applications}
        searchKey="job_title"
        emptyTitle="No applications found"
        emptyDescription="You haven't applied to any jobs yet."
      />

      <Drawer direction="right" open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DrawerContent className="h-full !w-[90vw] sm:!w-[800px] !max-w-none ml-auto right-0 rounded-none border-l">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="text-xl">Application Details</DrawerTitle>
            <DrawerDescription>
              Submitted on {formatDate(selectedApp?.applied_at)}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6 overflow-y-auto space-y-6">
            {selectedApp && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div 
                    className={`flex items-center gap-4 ${!!selectedApp.company_details ? 'group cursor-pointer' : ''}`}
                    onClick={(e) => {
                      if (selectedApp.company_details) {
                        e.stopPropagation();
                        setSelectedCompany(selectedApp.company_details ?? null);
                        setIsCompanyOpen(true);
                      }
                    }}
                  >
                    <div className={`w-12 h-12 rounded-lg border bg-muted flex items-center justify-center text-lg font-bold text-foreground shrink-0 overflow-hidden ${!!selectedApp.company_details ? 'group-hover:border-primary/50 transition-colors' : ''}`}>
                      {selectedApp.company_details?.company_logo ? (
                        <img 
                          src={selectedApp.company_details.company_logo.startsWith("http") ? selectedApp.company_details.company_logo : `/api/client/assets/${selectedApp.company_details.company_logo}`} 
                          alt={selectedApp.company_name ?? ""} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        getInitials(selectedApp.company_name)
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedApp.job_title ?? '—'}</h3>
                      <p className={`text-sm text-muted-foreground ${!!selectedApp.company_details ? 'group-hover:text-primary group-hover:underline transition-all' : ''}`}>
                        {selectedApp.company_name ?? '—'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="shrink-0"
                    disabled={loadingJob}
                    onClick={() => handleOpenJobPost(selectedApp.job_id)}
                  >
                    <span className="flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      {loadingJob ? "Loading..." : "View Original Job Post"}
                    </span>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-b border-border/50 pb-6">
                  {selectedApp.job_location && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10 capitalize">
                      {selectedApp.job_location.toLowerCase()}
                    </span>
                  )}
                  {selectedApp.job_type && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10 capitalize">
                      {selectedApp.job_type.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  )}
                  {selectedApp.work_arrangement && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10 capitalize">
                      {selectedApp.work_arrangement.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  )}
                  {selectedApp.experience_level && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10 capitalize">
                      {selectedApp.experience_level.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  )}
                </div>

                {selectedApp.job_description && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Job Description</p>
                    <div className="bg-muted/30 p-4 rounded-lg text-sm whitespace-pre-wrap border border-border/50 text-foreground max-h-60 overflow-y-auto">
                      {selectedApp.job_description}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Status</p>
                    <div><StatusBadge status={selectedApp.application_status} /></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Expected Salary</p>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      {selectedApp.expected_salary ? selectedApp.expected_salary.toLocaleString() : 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Cover Letter
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg text-sm whitespace-pre-wrap border border-border/50 text-foreground">
                    {selectedApp.cover_letter || <span className="text-muted-foreground italic">No cover letter provided.</span>}
                  </div>
                </div>

                {selectedApp.portfolio_url && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" /> Portfolio
                    </p>
                    <a
                      href={selectedApp.portfolio_url.startsWith('http') ? selectedApp.portfolio_url : `https://${selectedApp.portfolio_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline block truncate"
                    >
                      {selectedApp.portfolio_url}
                    </a>
                  </div>
                )}

                {selectedApp.resume && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Attached Resume
                    </p>
                    <a
                      href={selectedApp.resume.file_url.startsWith('http') ? selectedApp.resume.file_url : `/api/freelancer/assets/${selectedApp.resume.file_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-3 p-3 w-full rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground truncate block flex-1">
                        {selectedApp.resume.file_name || 'Resume Document'}
                      </span>
                    </a>
                  </div>
                )}

                {/* Application Progress Timeline */}
                <div className="border border-border bg-muted/20 p-5 rounded-xl space-y-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Application Progress</p>
                  
                  <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                    {selectedApp.application_status === "REJECTED" ? (
                      <>
                        {/* Step 1: Applied */}
                        <div className="relative flex gap-4 items-start">
                          <span className="absolute -left-[29px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-background">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Applied</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Your application was successfully submitted.</p>
                          </div>
                        </div>

                        {/* Step 2: Rejected */}
                        <div className="relative flex gap-4 items-start">
                          <span className="absolute -left-[29px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-rose-500 text-white ring-4 ring-background">
                            <XCircle className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Rejected</p>
                            <p className="text-xs text-muted-foreground mt-0.5">The employer decided not to move forward with your application.</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      (() => {
                        const statusOrder = ["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED", "HIRED"];
                        const currentIndex = statusOrder.indexOf(selectedApp.application_status);
                        
                        const steps = [
                          { label: "Applied", desc: "Your application was successfully submitted." },
                          { label: "Shortlisted", desc: "The employer has shortlisted you for potential opportunities." },
                          { label: "Interview Scheduled", desc: "An interview has been scheduled with the employer." },
                          { label: "Hired", desc: "Congratulations! You have been hired for this role." }
                        ];

                        return steps.map((step, idx) => {
                          const isCompleted = idx < currentIndex || selectedApp.application_status === "HIRED";
                          const isActive = idx === currentIndex && selectedApp.application_status !== "HIRED";
                          
                          let iconBg = "bg-muted text-muted-foreground";
                          let labelColor = "text-muted-foreground";
                          let Icon = Clock;

                          if (isCompleted) {
                            iconBg = "bg-emerald-500 text-white";
                            labelColor = "text-foreground font-medium";
                            Icon = CheckCircle;
                          } else if (isActive) {
                            iconBg = "bg-primary text-primary-foreground ring-4 ring-primary/20";
                            labelColor = "text-primary font-semibold";
                            if (idx === 1) Icon = Star;
                            else if (idx === 2) Icon = Calendar;
                            else Icon = Clock;
                          } else {
                            if (idx === 1) Icon = Star;
                            else if (idx === 2) Icon = Calendar;
                            else if (idx === 3) Icon = CheckCircle;
                          }

                          return (
                            <div key={idx} className="relative flex gap-4 items-start">
                              <span className={`absolute -left-[29px] flex h-[22px] w-[22px] items-center justify-center rounded-full text-white ring-4 ring-background ${iconBg}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <div>
                                <p className={`text-sm ${labelColor}`}>{step.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <JobDetailSheet 
        job={originalJob}
        open={isJobSheetOpen}
        onClose={() => setIsJobSheetOpen(false)}
      />

      <CompanyPreviewModal 
        company={selectedCompany}
        open={isCompanyOpen}
        onClose={() => setIsCompanyOpen(false)}
      />
    </>
  );
};
