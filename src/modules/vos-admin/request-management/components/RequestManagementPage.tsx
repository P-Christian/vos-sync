// src/modules/vos-admin/request-management/components/RequestManagementPage.tsx
//
// Plan 2 Todo 7 lane A: mode-selected VOS Request Management.
// The school filter is `'ALL' | RequestStatus` (FOUR) PLUS the derived
// `WAITING` filter. `WAITING` issues `?status=Pending` (the API has no waiting
// value — waiting is derived) and filters client-side to grouped `Pending`
// rows. The Course Requests tab stays four-valued and UNCHANGED.
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequests } from "../hooks/useRequests";
import type { RequestStatus } from "../types/request.types";
import { isWaitingSchoolRequest } from "./RequestStatusBadge";
import { SchoolRequestsTab } from "./SchoolRequestsTab";
import type { SchoolRequestsMode } from "./SchoolRequestsTab";
import { CourseRequestsTab } from "./CourseRequestsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Client-side mirror of the server-only EducationVerificationMode. Kept local
 *  (not imported) because the gate module is `server-only` and this is a
 *  client component; the server page passes the value down as a prop. */
export type RequestManagementMode = SchoolRequestsMode;

/** School filter: the four stored statuses + ALL, plus the derived WAITING. */
export type SchoolStatusFilter = "ALL" | RequestStatus | "WAITING";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/** Collapse internal whitespace and trim; empty collapses to null. */
function normalizeIdentityPart(value: string | null): string | null {
  if (value === null) return null;
  const collapsed = value.trim().replace(/\s+/g, " ");
  return collapsed === "" ? null : collapsed;
}

interface Props {
  mode: RequestManagementMode;
}

export function RequestManagementPage({ mode }: Props) {
  const {
    schoolRequests,
    courseRequests,
    fetchSchoolRequests,
    fetchCourseRequests,
    reviewSchoolRequest,
    courseClaims,
    courseFeedback,
    courseDecisionBusy,
    decideCourseRequest,
    resumeCourseClaim,
    decideSchoolRequest,
    searchSchoolsForRouting,
    schoolsForRouting,
    schoolSearchLoading,
    schoolSearchError,
    schoolFeedback,
    schoolDecisionBusy,
  } = useRequests();

  const [schoolStatusFilter, setSchoolStatusFilter] = useState<SchoolStatusFilter>("Pending");
  const [courseStatusFilter, setCourseStatusFilter] = useState("Pending");

  // WAITING has no server value: issue the Pending query, filter client-side.
  const schoolFetchStatus: "ALL" | RequestStatus =
    schoolStatusFilter === "WAITING" ? "Pending" : schoolStatusFilter;

  useEffect(() => {
    fetchSchoolRequests(schoolFetchStatus);
  }, [fetchSchoolRequests, schoolFetchStatus]);

  useEffect(() => {
    fetchCourseRequests(courseStatusFilter);
  }, [fetchCourseRequests, courseStatusFilter]);

  const visibleSchoolRequests = useMemo(
    () =>
      schoolStatusFilter === "WAITING"
        ? schoolRequests.filter((row) => isWaitingSchoolRequest(row))
        : schoolRequests,
    [schoolRequests, schoolStatusFilter],
  );

  const refetchSchools = useCallback(() => {
    fetchSchoolRequests(schoolFetchStatus);
  }, [fetchSchoolRequests, schoolFetchStatus]);

  /**
   * Repurposed "Add School Request": guarded normalized Draft-placeholder
   * creation via POST /api/vos-admin/schools (Todo 4). Accepts both the
   * legacy Add-modal shape ({requested_school_name,...}) and the decision
   * dialog shape ({school_name,...}); both are normalized (trim + collapse
   * internal whitespace) before sending. Blank names are rejected locally.
   */
  const createSchoolPlaceholder = useCallback(async (data: unknown): Promise<boolean> => {
    if (!isRecord(data)) {
      toast.error("School name must not be empty.");
      return false;
    }
    const rawName = readStringField(data, "school_name") ?? readStringField(data, "requested_school_name");
    const rawCity = readStringField(data, "city_municipality");
    const rawProvince = readStringField(data, "province");
    const school_name = rawName === null ? null : normalizeIdentityPart(rawName);
    if (school_name === null) {
      toast.error("School name must not be empty.");
      return false;
    }
    const body: Record<string, string> = { school_name };
    const city_municipality = normalizeIdentityPart(rawCity);
    const province = normalizeIdentityPart(rawProvince);
    if (city_municipality !== null) body.city_municipality = city_municipality;
    if (province !== null) body.province = province;
    try {
      const res = await fetch("/api/vos-admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json()) as unknown;
        const message =
          isRecord(json) && typeof json.error === "string" ? json.error : "Failed to create school placeholder.";
        toast.error(message);
        return false;
      }
      toast.success("Draft school placeholder created.");
      refetchSchools();
      return true;
    } catch {
      toast.error("School storage is temporarily unavailable.");
      return false;
    }
  }, [refetchSchools]);

  return (
    <div className="h-full flex-1 overflow-y-auto p-4 sm:p-8 bg-secondary/10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Request Management</h1>
        <p className="text-muted-foreground mt-1">Review and manage missing school and course requests.</p>
      </div>

      <Tabs defaultValue="schools" className="w-full">
        <TabsList className="bg-white/50 dark:bg-zinc-900/50 border dark:border-zinc-800 shadow-sm">
          <TabsTrigger value="schools">School Requests</TabsTrigger>
          <TabsTrigger value="courses">Course Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="schools" className="mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Missing Schools</h2>
            <Select value={schoolStatusFilter} onValueChange={(value) => setSchoolStatusFilter(value as SchoolStatusFilter)}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900 dark:border-zinc-800" data-testid="school-status-filter">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending Only</SelectItem>
                <SelectItem value="WAITING">Waiting for school</SelectItem>
                <SelectItem value="RoutedToSchool">Routed to School</SelectItem>
                <SelectItem value="Approved">Approved Only</SelectItem>
                <SelectItem value="Rejected">Rejected Only</SelectItem>
                <SelectItem value="ALL">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SchoolRequestsTab
            requests={visibleSchoolRequests}
            mode={mode}
            // Repurposed (Plan 2 Todo 7): "Add School Request" now creates a
            // guarded normalized Draft placeholder (POST /api/vos-admin/schools),
            // not a raw school request. The Add-modal shape is normalized inside
            // createSchoolPlaceholder, which already refetches on success.
            onCreate={createSchoolPlaceholder}
            onCreatePlaceholder={createSchoolPlaceholder}
            onReview={reviewSchoolRequest}
            onDecide={decideSchoolRequest}
            onSearchSchools={searchSchoolsForRouting}
            candidatesFor={(id) => schoolsForRouting[id] ?? []}
            candidatesLoadingFor={(id) => schoolSearchLoading[id] ?? false}
            candidatesErrorFor={(id) => schoolSearchError[id] ?? null}
            decisionBusyFor={(id) => schoolDecisionBusy[id] ?? false}
            feedbackFor={(id) => schoolFeedback[id]}
            onDecided={refetchSchools}
          />
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Missing Courses</h2>
            <Select value={courseStatusFilter} onValueChange={setCourseStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900 dark:border-zinc-800">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending Only</SelectItem>
                <SelectItem value="Approved">Approved Only</SelectItem>
                <SelectItem value="Rejected">Rejected Only</SelectItem>
                <SelectItem value="RoutedToSchool">Routed to School</SelectItem>
                <SelectItem value="ALL">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CourseRequestsTab
            requests={courseRequests}
            claims={courseClaims}
            feedback={courseFeedback}
            busy={courseDecisionBusy}
            onDecide={decideCourseRequest}
            onResume={resumeCourseClaim}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
