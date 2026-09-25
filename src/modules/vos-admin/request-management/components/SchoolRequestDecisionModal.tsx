// src/modules/vos-admin/request-management/components/SchoolRequestDecisionModal.tsx
//
// Plan 2 Todo 6: school-request-only correction dialog (attendance lane).
// PRESENTATIONAL and PROPS-BASED — mirrors CourseRequestDecisionModal exactly:
// the dialog never fetches and never mutates; the hook (Todo 7) supplies
// server-classified candidates and performs Route/Group/Reject/placeholder
// mutations. The legacy ReviewModal stays intact behind `legacy` mode.
"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { VsSchoolRequest } from "../types/request.types";

export type SchoolDecisionTab = "correct" | "reject";

/**
 * Server-derived route state per selectable school. Mirrors
 * `classifySchoolRoute` (school-request-routing/records.ts) and
 * `classifySearchRow` (schoolRouteSearch.repo.ts). Null is excluded: only
 * classified schools ever reach this dialog.
 */
export type SchoolVerificationRoute =
  | "DIRECT_REVIEW"
  | "AWAITING_ACTIVATION"
  | "AWAITING_REGISTRATION";

/**
 * Client-safe selectable school candidate as returned by the role-guarded
 * `GET /api/vos-admin/schools?search=` endpoint. Option values are these
 * typed IDs; free-form numeric school-ID input is never accepted.
 */
export interface SchoolRoutingCandidate {
  readonly school_id: number;
  readonly school_name: string;
  readonly city_municipality: string | null;
  readonly province: string | null;
  readonly verification_route: SchoolVerificationRoute;
}

/** Guarded Draft-placeholder input: name required, location optional. */
export interface SchoolPlaceholderInput {
  readonly school_name: string;
  readonly city_municipality?: string;
  readonly province?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The school request under review. Null renders nothing (dialog stays closed-safe). */
  request: VsSchoolRequest | null;
  initialTab?: SchoolDecisionTab;
  /** Server-classified selectable schools from the VOS correction search. */
  candidates: readonly SchoolRoutingCandidate[];
  candidatesLoading: boolean;
  candidatesError: string | null;
  onRetryCandidates?: () => void;
  /** Forward a search term to the server-classified search (Todo 7 wires this). */
  onSearch: (query: string) => void;
  /** True while a decision/placeholder mutation is in flight; all controls lock. */
  mutating: boolean;
  onRoute: (schoolId: number) => Promise<boolean>;
  onGroup: (schoolId: number) => Promise<boolean>;
  onReject: (adminRemarks: string) => Promise<boolean>;
  onCreatePlaceholder: (input: SchoolPlaceholderInput) => Promise<boolean>;
}

function submitterLabel(request: VsSchoolRequest): string {
  const by = request.requested_by;
  if (typeof by === "object" && by !== null) {
    return `${by.user_fname} ${by.user_lname} (User #${by.user_id})`;
  }
  return `User #${by}`;
}

function requestedIdentity(request: VsSchoolRequest): string {
  const location = [request.city_municipality, request.province]
    .filter((part) => typeof part === "string" && part.trim() !== "")
    .join(", ");
  return location === "" ? request.requested_school_name : `${request.requested_school_name} — ${location}`;
}

function candidateLabel(c: SchoolRoutingCandidate): string {
  const location = [c.city_municipality, c.province]
    .filter((part) => typeof part === "string" && part.trim() !== "")
    .join(", ");
  const route =
    c.verification_route === "DIRECT_REVIEW"
      ? "Direct review"
      : c.verification_route === "AWAITING_ACTIVATION"
        ? "Awaiting activation"
        : "Awaiting registration";
  const place = location === "" ? "" : ` — ${location}`;
  return `${c.school_name}${place} (${route})`;
}

export function SchoolRequestDecisionModal({
  open,
  onOpenChange,
  request,
  initialTab = "correct",
  candidates,
  candidatesLoading,
  candidatesError,
  onRetryCandidates,
  onSearch,
  mutating,
  onRoute,
  onGroup,
  onReject,
  onCreatePlaceholder,
}: Props) {
  const [tab, setTab] = useState<SchoolDecisionTab>(initialTab);
  const [query, setQuery] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>(undefined);
  const [remarks, setRemarks] = useState("");
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [placeholderName, setPlaceholderName] = useState("");
  const [placeholderCity, setPlaceholderCity] = useState("");
  const [placeholderProvince, setPlaceholderProvince] = useState("");
  const [placeholderArmed, setPlaceholderArmed] = useState(false);
  const [placeholderDone, setPlaceholderDone] = useState(false);

  const requestKey = request?.school_request_id ?? null;
  const [lastSessionKey, setLastSessionKey] = useState<string | null>(null);
  const sessionKey = open && requestKey !== null ? `${requestKey}:${initialTab}` : null;
  if (sessionKey !== lastSessionKey) {
    setLastSessionKey(sessionKey);
    if (sessionKey !== null) {
      setTab(initialTab);
      setQuery("");
      setSelectedSchoolId(undefined);
      setRemarks("");
      setConfirmArmed(false);
      setSubmitting(false);
      setPlaceholderName("");
      setPlaceholderCity("");
      setPlaceholderProvince("");
      setPlaceholderArmed(false);
      setPlaceholderDone(false);
    }
  }

  const selected = useMemo(
    () => candidates.find((c) => String(c.school_id) === selectedSchoolId) ?? null,
    [candidates, selectedSchoolId],
  );

  const options = useMemo(
    () =>
      candidates.map((c) => ({
        value: String(c.school_id),
        label: candidateLabel(c),
      })),
    [candidates],
  );

  const busy = mutating || submitting;
  // The selected route state alone determines Route vs Group — never a toggle.
  const selectedAction = selected === null ? null : selected.verification_route === "DIRECT_REVIEW" ? "Route" : "Group";
  const correctDisabled = busy || candidatesLoading || candidatesError !== null || selected === null;
  const rejectDisabled = busy || remarks.trim() === "";
  const placeholderValid = placeholderName.trim() !== "";

  const resetArmed = () => setConfirmArmed(false);

  const handleSearch = () => {
    if (busy) return;
    setSelectedSchoolId(undefined);
    resetArmed();
    onSearch(query);
  };

  const handleCorrectConfirm = async () => {
    if (selected === null) return;
    setSubmitting(true);
    try {
      const ok =
        selected.verification_route === "DIRECT_REVIEW"
          ? await onRoute(selected.school_id)
          : await onGroup(selected.school_id);
      if (ok) {
        resetArmed();
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (remarks.trim() === "") return;
    setSubmitting(true);
    try {
      const ok = await onReject(remarks);
      if (ok) {
        resetArmed();
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceholderConfirm = async () => {
    if (!placeholderValid) return;
    setSubmitting(true);
    try {
      const ok = await onCreatePlaceholder({
        school_name: placeholderName.trim(),
        ...(placeholderCity.trim() !== "" ? { city_municipality: placeholderCity.trim() } : {}),
        ...(placeholderProvince.trim() !== "" ? { province: placeholderProvince.trim() } : {}),
      });
      if (ok) {
        setPlaceholderArmed(false);
        setPlaceholderDone(true);
        // Refresh the classified search so the new AWAITING_REGISTRATION
        // placeholder becomes selectable for Group.
        onSearch(placeholderName.trim());
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={busy ? () => undefined : onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review School Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border p-3 text-sm" data-testid="school-decision-identity">
            <div className="font-medium">Requested school: {requestedIdentity(request)}</div>
            <div className="mt-1 text-muted-foreground">Submitted by {submitterLabel(request)}</div>
          </div>

          <div className="flex gap-2" role="tablist" aria-label="Decision type">
            {(["correct", "reject"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={tab === t ? "default" : "outline"}
                size="sm"
                disabled={busy}
                onClick={() => {
                  setTab(t);
                  resetArmed();
                }}
                data-testid={`school-decision-tab-${t}`}
              >
                {t === "correct" ? "Route / Group" : "Reject"}
              </Button>
            ))}
          </div>

          {tab === "correct" && (
            <div className="space-y-2" data-testid="school-decision-correct">
              <Label htmlFor="school-decision-search">Search selectable schools</Label>
              <div className="flex gap-2">
                <Input
                  id="school-decision-search"
                  placeholder="Search by school name, city, or province..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  disabled={busy}
                  data-testid="school-decision-search"
                />
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={handleSearch} data-testid="school-decision-search-submit">
                  Search
                </Button>
              </div>

              {candidatesLoading ? (
                <p className="text-sm text-muted-foreground" data-testid="school-decision-loading">
                  Loading schools...
                </p>
              ) : candidatesError !== null ? (
                <div className="space-y-2" data-testid="school-decision-error">
                  <p className="text-sm text-red-600">{candidatesError}</p>
                  {onRetryCandidates && (
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRetryCandidates} data-testid="school-decision-retry">
                      Retry
                    </Button>
                  )}
                </div>
              ) : candidates.length === 0 ? (
                <div className="space-y-2" data-testid="school-decision-empty">
                  <p className="text-sm text-muted-foreground">
                    No selectable schools found. Create a guarded Draft placeholder below, then
                    group this request to it.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {candidates.length > 1 && (
                    <p className="text-sm text-amber-700" data-testid="school-decision-ambiguous">
                      Multiple schools match — select the exact school. Nothing is applied until
                      you confirm.
                    </p>
                  )}
                  <SearchableSelect
                    options={options}
                    value={selectedSchoolId}
                    onValueChange={(value) => {
                      setSelectedSchoolId(value);
                      resetArmed();
                    }}
                    placeholder="Select a school..."
                    disabled={busy}
                  />
                </div>
              )}

              {selected !== null && (
                <p className="text-sm text-muted-foreground" data-testid="school-decision-selected-route">
                  {selected.verification_route === "DIRECT_REVIEW"
                    ? "This school can review now — confirming will Route this request."
                    : "This school cannot review yet — confirming will Group this request as waiting."}
                </p>
              )}

              {!confirmArmed ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled={correctDisabled}
                  onClick={() => setConfirmArmed(true)}
                  data-testid="school-decision-correct-start"
                >
                  {busy ? "Processing..." : selectedAction === null ? "Select a school" : selectedAction === "Route" ? "Route to school" : "Group as waiting"}
                </Button>
              ) : (
                selected !== null &&
                selectedAction !== null && (
                  <div className="space-y-2" data-testid="school-decision-correct-confirm">
                    <p className="text-sm font-medium">
                      Confirm {selectedAction === "Route" ? "routing" : "grouping"} this request to{" "}
                      {selected.school_name}?
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={resetArmed}>
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={correctDisabled}
                        onClick={handleCorrectConfirm}
                        data-testid="school-decision-correct-confirm-submit"
                      >
                        {busy ? "Processing..." : `Confirm ${selectedAction}`}
                      </Button>
                    </div>
                  </div>
                )
              )}

              <div className="space-y-2 rounded-md border p-3" data-testid="school-decision-placeholder">
                <Label>Create Draft placeholder (when no match exists)</Label>
                <p className="text-sm text-muted-foreground">
                  Guarded VOS-Admin creation only. The new placeholder is Awaiting registration —
                  after creation, select it above to Group this request.
                </p>
                {placeholderDone && (
                  <p className="text-sm text-emerald-700" data-testid="school-decision-placeholder-done">
                    Placeholder created. Search results refreshed — select the new school above to
                    group this request.
                  </p>
                )}
                <Input
                  placeholder="School name (required)"
                  value={placeholderName}
                  onChange={(e) => setPlaceholderName(e.target.value)}
                  disabled={busy}
                  data-testid="school-decision-placeholder-name"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="City / municipality (optional)"
                    value={placeholderCity}
                    onChange={(e) => setPlaceholderCity(e.target.value)}
                    disabled={busy}
                    data-testid="school-decision-placeholder-city"
                  />
                  <Input
                    placeholder="Province (optional)"
                    value={placeholderProvince}
                    onChange={(e) => setPlaceholderProvince(e.target.value)}
                    disabled={busy}
                    data-testid="school-decision-placeholder-province"
                  />
                </div>
                {!placeholderArmed ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={busy || !placeholderValid}
                    onClick={() => setPlaceholderArmed(true)}
                    data-testid="school-decision-placeholder-start"
                  >
                    Create Draft placeholder
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Confirm creating a Draft placeholder for “{placeholderName.trim()}”?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={busy}
                        onClick={() => setPlaceholderArmed(false)}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={busy || !placeholderValid}
                        onClick={handlePlaceholderConfirm}
                        data-testid="school-decision-placeholder-confirm"
                      >
                        {busy ? "Processing..." : "Confirm creation"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "reject" && (
            <div className="space-y-2" data-testid="school-decision-reject">
              <Label>Admin Remarks (Required)</Label>
              <p className="text-sm text-muted-foreground">Provide a reason for rejecting this request.</p>
              <Textarea
                placeholder="Reason for rejection..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={busy}
                data-testid="school-decision-remarks"
              />
              {remarks.trim() === "" && (
                <p className="text-sm text-red-600" data-testid="school-decision-reject-validation">
                  Remarks are required to reject this request.
                </p>
              )}
              {!confirmArmed ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={rejectDisabled}
                  onClick={() => setConfirmArmed(true)}
                  data-testid="school-decision-reject-start"
                >
                  {busy ? "Processing..." : "Reject request"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Confirm rejecting this request?</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={resetArmed}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      disabled={rejectDisabled}
                      onClick={handleReject}
                      data-testid="school-decision-reject-confirm"
                    >
                      {busy ? "Processing..." : "Confirm rejection"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
