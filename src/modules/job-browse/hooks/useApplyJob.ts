/* eslint-disable @typescript-eslint/no-explicit-any */
// src/modules/job-browse/hooks/useApplyJob.ts
"use client";

import { useState, useCallback } from "react";
import { ApplyFormData, PublicJobPosting } from "../types";

const EMPTY_FORM: Omit<ApplyFormData, "job_id" | "screening_answers"> = {
  cover_letter: "",
  expected_salary: "",
  portfolio_url: "",
};

interface FreelancerPrefill {
  cover_letter: string;
  expected_salary: string;
  portfolio_url: string;
}

export function useApplyJob() {
  const [formData, setFormData] = useState<ApplyFormData>({
    job_id: 0,
    ...EMPTY_FORM,
    screening_answers: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  // Load freelancer profile data to pre-fill the form
  const loadPrefill = useCallback(async (job: PublicJobPosting) => {
    setPrefillLoading(true);
    setError("");
    setSuccessMessage("");
    setProfileData(null);

    const prefill: FreelancerPrefill = {
      cover_letter: "",
      expected_salary: "",
      portfolio_url: "",
    };

    try {
      const profileRes = await fetch("/api/freelancer/profile");
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        if (profileJson.ok && profileJson.data) {
          const profile = profileJson.data;
          setProfileData(profile);

          const innerProfile = profile.job_seeker_profile?.[0] || profile.job_seeker_profile || {};
          if (innerProfile.professional_summary) {
            prefill.cover_letter = innerProfile.professional_summary;
          }
          if (innerProfile.expected_salary != null) {
            prefill.expected_salary = String(innerProfile.expected_salary);
          }

          const links = profile.social_links || [];
          const portfolioLink = links.find(
            (l: { platform_name: string; profile_url: string }) => l.platform_name?.toLowerCase() === "portfolio"
          );
          if (portfolioLink?.profile_url) {
            prefill.portfolio_url = portfolioLink.profile_url;
          }
        }
      }
    } catch (err) {
      console.error("Error loading prefill profile:", err);
    }

    setFormData({
      job_id: job.job_id,
      cover_letter: prefill.cover_letter,
      expected_salary: prefill.expected_salary,
      portfolio_url: prefill.portfolio_url,
      custom_resume: null,
      cover_letter_file: null,
      screening_answers: (job.screening_questions ?? []).map((q) => {
        if (typeof q === "object" && q !== null) {
          return {
            question_id: q.question_id,
            question_text: q.question_text,
            answer_text: "",
          };
        }
        return { question_text: String(q), answer_text: "" };
      }),
    });

    setPrefillLoading(false);
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof Omit<ApplyFormData, "screening_answers">, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleAnswerChange = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const answers = [...prev.screening_answers];
      answers[index] = { ...answers[index], answer_text: value };
      return { ...prev, screening_answers: answers };
    });
  }, []);

  const uploadDocument = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/freelancer/messaging/upload", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to upload document.");
    return {
      file_name: json.file_name || file.name,
      file_path: json.file_path,
      file_size: json.file_size || file.size,
      mime_type: json.mime_type || file.type,
    };
  }, []);

  const submitApplication = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      let finalCoverLetter = formData.cover_letter?.trim() || "";
      if (formData.cover_letter_file) {
        const fileLinkText = `[Cover Letter Document: ${formData.cover_letter_file.file_name}](${formData.cover_letter_file.file_path})`;
        finalCoverLetter = finalCoverLetter
          ? `${finalCoverLetter}\n\n${fileLinkText}`
          : fileLinkText;
      }

      const res = await fetch("/api/freelancer/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: formData.job_id,
          cover_letter: finalCoverLetter || null,
          expected_salary: formData.expected_salary ? Number(formData.expected_salary) : null,
          portfolio_url: formData.portfolio_url || null,
          custom_resume: formData.custom_resume || null,
          screening_answers:
            formData.screening_answers.length > 0 ? formData.screening_answers : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit application.");
      setSuccessMessage("Application submitted successfully!");
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData]);

  const reset = useCallback(() => {
    setFormData({ job_id: 0, ...EMPTY_FORM, custom_resume: null, cover_letter_file: null, screening_answers: [] });
    setProfileData(null);
    setError("");
    setSuccessMessage("");
  }, []);

  return {
    formData,
    saving,
    error,
    successMessage,
    prefillLoading,
    profileData,
    loadPrefill,
    handleFieldChange,
    handleAnswerChange,
    uploadDocument,
    submitApplication,
    reset,
  };
}
