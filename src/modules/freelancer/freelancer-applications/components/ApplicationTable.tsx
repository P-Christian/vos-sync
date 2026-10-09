"use client";

import React, { useState } from "react";
import { ApplicationItem, CompanyProfile } from "../types";
import { Eye, MoreVertical, XOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompanyPreviewModal from "./CompanyPreviewModal";
import { DataTable } from "./NewDataTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApplicationStatusBadge } from "./application-table/ApplicationStatusBadge";
import { AssessmentActionItem } from "./application-table/AssessmentActionItem";
import { AssessmentDueBadge } from "./application-table/AssessmentDueBadge";
import { ApplicationDetailsDrawer } from "./application-table/ApplicationDetailsDrawer";
import { ApplicationMobileList } from "./application-table/ApplicationMobileList";
import { WithdrawApplicationDialog } from "./application-table/WithdrawApplicationDialog";
import { formatDate, getInitials } from "./application-table/formatters";
import { AssessmentSubmissionDialog } from "./AssessmentSubmissionDialog";

interface Props {
  applications: ApplicationItem[];
  onRefresh?: () => void;
  mobileSearch?: string;
}

export const ApplicationTable: React.FC<Props> = ({ applications, onRefresh, mobileSearch }) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [withdrawApp, setWithdrawApp] = useState<ApplicationItem | null>(null);
  const [assessmentApp, setAssessmentApp] = useState<ApplicationItem | null>(null);

  const refreshList = () => {
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  const openCompany = (company: CompanyProfile | null) => {
    setSelectedCompany(company);
    setIsCompanyOpen(true);
  };

  const columns: ColumnDef<ApplicationItem>[] = [
    {
      accessorKey: "job_title",
      header: "Job Title",
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div>
            <div className="text-sm font-semibold text-foreground">{app.job_title ?? "—"}</div>
            <div className="text-sm md:text-xs text-muted-foreground mt-0.5">
              {[app.job_type, app.job_location].filter(Boolean).join(" • ")}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "company_name",
      header: "Company",
      cell: ({ row }) => {
        const app = row.original;
        const isClickable = !!app.company_details;
        return (
          <div
            className={`flex items-center gap-2.5 ${isClickable ? "group cursor-pointer" : ""}`}
            onClick={(e) => {
              if (isClickable) {
                e.stopPropagation();
                openCompany(app.company_details ?? null);
              }
            }}
          >
            <div
              className={`w-10 h-10 rounded border bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0 overflow-hidden ${isClickable ? "group-hover:border-primary/50 transition-colors" : ""}`}
            >
              {app.company_details?.company_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    app.company_details.company_logo.startsWith("http")
                      ? app.company_details.company_logo
                      : `/api/client/assets/${app.company_details.company_logo}`
                  }
                  alt={app.company_name ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(app.company_name)
              )}
            </div>
            <span
              className={`text-sm text-foreground ${isClickable ? "group-hover:text-primary group-hover:underline transition-all" : ""}`}
            >
              {app.company_name ?? "—"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "applied_at",
      header: "Date Applied",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.applied_at)}
        </span>
      ),
    },
    {
      accessorKey: "application_status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {row.original.assessment?.needs_action ? (
            <AssessmentDueBadge deadline={row.original.assessment?.deadline ?? null} />
          ) : (
            <ApplicationStatusBadge status={row.original.application_status} />
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground max-md:size-11"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {app.assessment?.available && (
                  <AssessmentActionItem application={app} onOpen={setAssessmentApp} />
                )}
                <DropdownMenuItem
                  onClick={() => setSelectedApp(app)}
                  className="cursor-pointer gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Application
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWithdrawApp(app)}
                  className="cursor-pointer gap-2 text-rose-500 focus:text-rose-500"
                >
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
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={applications}
          searchKey="job_title"
          emptyTitle="No applications found"
          emptyDescription="You haven't applied to any jobs yet."
        />
      </div>

      <div className="md:hidden">
        <ApplicationMobileList
          applications={applications}
          mobileSearch={mobileSearch}
          onView={(app) => setSelectedApp(app)}
          onWithdraw={(app) => setWithdrawApp(app)}
          onOpenAssessment={(app) => setAssessmentApp(app)}
        />
      </div>

      <ApplicationDetailsDrawer
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onSelectCompany={openCompany}
      />

      <CompanyPreviewModal
        company={selectedCompany}
        open={isCompanyOpen}
        onClose={() => setIsCompanyOpen(false)}
      />

      <WithdrawApplicationDialog
        application={withdrawApp}
        onClose={() => setWithdrawApp(null)}
        onWithdrawn={refreshList}
      />

      <AssessmentSubmissionDialog
        application={assessmentApp}
        open={assessmentApp !== null}
        onOpenChange={(open) => {
          if (!open) setAssessmentApp(null);
        }}
        onMutated={onRefresh}
      />
    </>
  );
};
