"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Applicant,
  ApplicationStatus,
  CandidateDetail,
} from "../types";

export function useApplicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    ApplicationStatus | "ALL"
  >("ALL");

  const [search, setSearch] = useState("");

  const [detail, setDetail] =
    useState<CandidateDetail | null>(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [detailError, setDetailError] =
    useState("");

  // --------------------------------
  // Fetch applicant list
  // --------------------------------

  const fetchApplicants = useCallback(
    async (
      status?: ApplicationStatus | "ALL",
      jobId?: number
    ) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (status && status !== "ALL") {
          params.set("status", status);
        }

        if (jobId) {
          params.set("job_id", String(jobId));
        }

        const query = params.toString();

        const res = await fetch(
          `/api/client/applicants${
            query ? `?${query}` : ""
          }`
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            json.error ||
              "Failed to load applicants."
          );
        }

        setApplicants(json.applicants ?? []);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // --------------------------------
  // Update status
  // --------------------------------

  const updateStatus = useCallback(
    async (
      applicationId: number,
      status: ApplicationStatus,
      notes: string
    ) => {
      setSaving(true);
      setError("");

      try {
        const res = await fetch(
          `/api/client/applicants/${applicationId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              application_status: status,
              client_notes: notes,
            }),
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            json.error ||
              "Failed to update status."
          );
        }

        setApplicants((prev) =>
          prev.map((applicant) =>
            applicant.application_id ===
            applicationId
              ? {
                  ...applicant,
                  application_status:
                    status,
                  client_notes: notes,
                }
              : applicant
          )
        );

        return true;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred."
        );

        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // --------------------------------
  // Fetch single applicant
  // --------------------------------

  const fetchApplicantDetail =
    useCallback(
      async (
        applicationId: number
      ) => {
        setDetailLoading(true);
        setDetailError("");

        try {
          const res = await fetch(
            `/api/client/applicants/${applicationId}`
          );

          const json =
            await res.json();

          if (!res.ok) {
            throw new Error(
              json.error ||
                "Failed to load candidate details."
            );
          }

          setDetail(
            json.applicant ?? null
          );
        } catch (err: unknown) {
          setDetailError(
            err instanceof Error
              ? err.message
              : "An error occurred."
          );

          setDetail(null);
        } finally {
          setDetailLoading(false);
        }
      },
      []
    );

  // --------------------------------
  // Clear detail
  // --------------------------------

  const clearDetail = useCallback(() => {
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
  }, []);

  // --------------------------------
  // Search + filters
  // --------------------------------

  const filteredApplicants = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return applicants.filter(
      (applicant) => {
        const matchesStatus =
          filterStatus === "ALL" ||
          applicant.application_status ===
            filterStatus;

        if (!matchesStatus) {
          return false;
        }

        if (!query) {
          return true;
        }

        const skillsText =
          applicant.skills
            ?.join(" ")
            .toLowerCase() ?? "";

        return (
          applicant.applicant_name
            ?.toLowerCase()
            .includes(query) ||
          applicant.applicant_email
            ?.toLowerCase()
            .includes(query) ||
          applicant.job_title
            ?.toLowerCase()
            .includes(query) ||
          skillsText.includes(query)
        );
      }
    );
  }, [
    applicants,
    filterStatus,
    search,
  ]);

  return {
    applicants: filteredApplicants,

    rawApplicants: applicants,

    loading,
    saving,

    error,

    filterStatus,
    setFilterStatus,

    search,
    setSearch,

    fetchApplicants,
    updateStatus,

    clearError: () =>
      setError(""),

    detail,
    detailLoading,
    detailError,

    fetchApplicantDetail,
    clearDetail,
  };
}