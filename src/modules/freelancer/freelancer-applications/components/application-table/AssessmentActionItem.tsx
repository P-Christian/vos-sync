// src/modules/freelancer/freelancer-applications/components/application-table/AssessmentActionItem.tsx
"use client";

import React from "react";
import { ClipboardList } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ApplicationItem } from "../../types";
import { assessmentActionLabel } from "../../services/assessment-form";

interface Props {
  application: ApplicationItem;
  onOpen: (application: ApplicationItem) => void;
}

export function AssessmentActionItem({ application, onOpen }: Props) {
  const summary = application.assessment;
  if (!summary?.available || summary.status === null) return null;
  return (
    <DropdownMenuItem
      onClick={() => onOpen(application)}
      className="cursor-pointer gap-2"
    >
      <ClipboardList className="w-4 h-4" />
      {assessmentActionLabel(summary.status)}
    </DropdownMenuItem>
  );
}
