/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Paperclip,
  Upload,
  X,
  FileText,
} from "lucide-react";
import { PublicJobPosting } from "../types";
import { useApplyJob } from "../hooks/useApplyJob";

interface Props {
  job: PublicJobPosting | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getInitials(fname?: string | null, lname?: string | null): string {
  if (!fname && !lname) return "?";
  const f = fname ? fname[0] : "";
  const l = lname ? lname[0] : "";
  return `${f}${l}`.toUpperCase();
}

export function ApplyModal({ job, open, onClose, onSuccess }: Props) {
  const {
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
  } = useApplyJob();

  const [currentStep, setCurrentStep] = useState(1);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingCoverFile, setUploadingCoverFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Load pre-fill whenever the modal opens with a new job
  useEffect(() => {
    if (open && job) {
      loadPrefill(job);
      
      // Check for active referral claim
      setReferrerName(null);
      fetch(`/api/freelancer/referrals/check-claim?job_id=${job.job_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.claimed) {
            setReferrerName(data.referrer_name);
          }
        })
        .catch((err) => console.error("Error checking claim:", err));
    }
  }, [open, job, loadPrefill]);

  const handleClose = () => {
    reset();
    setCurrentStep(1);
    setUploadError("");
    onClose();
  };

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    setUploadError("");
    try {
      const uploaded = await uploadDocument(file);
      handleFieldChange("custom_resume", uploaded);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload custom resume.");
    } finally {
      setUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  };

  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCoverFile(true);
    setUploadError("");
    try {
      const uploaded = await uploadDocument(file);
      handleFieldChange("cover_letter_file", uploaded);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload cover letter document.");
    } finally {
      setUploadingCoverFile(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    const ok = await submitApplication();
    if (ok) {
      setTimeout(() => {
        reset();
        setCurrentStep(1);
        onClose();
        onSuccess();
      }, 1200);
    }
  };

  if (!job) return null;

  const hasScreening = !!(job.screening_questions && job.screening_questions.length > 0);
  
  // Jobstreet style steps
  const steps = [
    { id: "documents", label: "Choose documents" },
    ...(hasScreening ? [{ id: "questions", label: "Answer employer questions" }] : []),
    { id: "profile", label: "Update Profile Details" },
    { id: "review", label: "Review and submit" }
  ];

  const totalSteps = steps.length;
  const stepInfo = steps[currentStep - 1];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()} >
      <DialogContent className="sm:max-w-7xl w-full flex flex-col p-0 gap-0 h-220">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-base font-bold">Apply for Position</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{job.job_title}</span>
            {job.company_name ? ` at ${job.company_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Seek/Jobstreet Style Horizontal Stepper */}
        <div className="px-6 py-4 border-b bg-muted/10 shrink-0">
          <div className="flex items-center justify-between relative">
            {/* Background progress line */}
            <div className="absolute top-3 left-3 right-3 h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10" />
            {/* Active progress line */}
            <div
              className="absolute top-3 left-3 h-0.5 bg-primary transition-all duration-300 -z-10"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />

            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isCompleted = currentStep > stepNum;
              const isActive = currentStep === stepNum;
              return (
                <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 transition-all ${
                      isCompleted
                        ? "bg-primary border-primary text-white"
                        : isActive
                        ? "bg-background border-primary text-primary"
                        : "bg-background border-zinc-300 dark:border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {isCompleted ? "✓" : stepNum}
                  </div>
                  <span
                    className={`text-[8px] font-semibold text-center hidden sm:block ${
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {prefillLoading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Loading your freelancer profile data...
              </div>
            )}

            {/* Success */}
            {successMessage && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {successMessage}
              </div>
            )}

            {/* Error */}
            {(error || uploadError) && (
              <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error || uploadError}
              </div>
            )}

            {/* Referral Connected */}
            {referrerName && (
              <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm font-medium">
                <span className="text-base">🔗</span>
                <span>Referral Connected: Accepted invitation from <strong>{referrerName}</strong>. This referral will be locked in when you submit.</span>
              </div>
            )}

            {/* STEP 1: Documents */}
            {stepInfo.id === "documents" && (
              <div className="space-y-6">
                {/* User card matching image */}
                <div className="p-4 bg-[#0a192f] text-white rounded-2xl flex items-center gap-4 relative overflow-hidden shadow-md">
                  <div className="w-14 h-14 bg-rose-200 text-[#0a192f] rounded-2xl flex items-center justify-center text-xl font-bold font-mono">
                    {profileData ? getInitials(profileData.user_fname, profileData.user_lname) : "?"}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm tracking-wide">
                      {profileData ? `${profileData.user_fname} ${profileData.user_lname}` : "Loading name..."}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {[profileData?.user_city, profileData?.user_province].filter(Boolean).join(", ") || "Location not specified"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{profileData?.user_contact || "No contact number"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{profileData?.user_email || "No email address"}</span>
                    </div>
                  </div>
                  {/* Decorative shape */}
                  <div className="absolute right-0 bottom-0 w-16 h-16 bg-rose-500 rounded-full translate-x-4 translate-y-4 opacity-70" />
                </div>

                {/* Resumé */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Resumé</h3>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleResumeFileSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving || uploadingResume}
                      onClick={() => resumeInputRef.current?.click()}
                      className="h-8 text-xs gap-1.5 rounded-lg font-medium"
                    >
                      {uploadingResume ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {formData.custom_resume ? "Change Uploaded Resumé" : "Upload / Change Resumé"}
                    </Button>
                  </div>

                  {formData.custom_resume ? (
                    <div className="flex items-center gap-3 p-3.5 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20">
                      <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {formData.custom_resume.file_name}
                        </p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                          Custom Resumé attached for this application
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldChange("custom_resume", null)}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        title="Revert to profile resume"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3.5 border rounded-xl bg-muted/20">
                      <Paperclip className="h-5 w-5 text-zinc-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {profileData?.resumes?.[0]?.file_name || "Primary Profile Resume.pdf"}
                        </p>
                        <p className="text-[10px] text-[#14a800] font-medium">Resumé attached from profile</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Cover letter</h3>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={handleCoverFileSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving || uploadingCoverFile}
                      onClick={() => coverFileInputRef.current?.click()}
                      className="h-8 text-xs gap-1.5 rounded-lg font-medium"
                    >
                      {uploadingCoverFile ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Paperclip className="h-3.5 w-3.5" />
                      )}
                      {formData.cover_letter_file ? "Change Attachment" : "Attach Document"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      id="apply-cover-letter"
                      placeholder="Tell the employer why you're a great fit for this role..."
                      value={formData.cover_letter}
                      onChange={(e) => handleFieldChange("cover_letter", e.target.value)}
                      rows={5}
                      className="resize-none text-sm rounded-xl"
                      disabled={saving}
                    />

                    {formData.cover_letter_file && (
                      <div className="flex items-center gap-3 p-3 border border-emerald-200 dark:border-emerald-800 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
                        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {formData.cover_letter_file.file_name}
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Document attached to cover letter
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldChange("cover_letter_file", null)}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground">
                      Write a cover letter tailored to this role. You can also attach a document, or both.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Screening Questions */}
            {stepInfo.id === "questions" && hasScreening && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Employer Questions
                </div>
                {job.screening_questions?.map((question, i) => {
                  const qText = typeof question === "object" && question !== null ? question.question_text : String(question);
                  return (
                    <div key={i} className="space-y-1.5 p-3.5 border rounded-xl bg-muted/20">
                      <Label
                        htmlFor={`screening-answer-${i}`}
                        className="text-sm font-semibold leading-snug text-foreground"
                      >
                        {qText}
                      </Label>
                      <Textarea
                        id={`screening-answer-${i}`}
                        placeholder="Your answer..."
                        value={formData.screening_answers[i]?.answer_text ?? ""}
                        onChange={(e) => handleAnswerChange(i, e.target.value)}
                        rows={3}
                        className="resize-none text-sm rounded-xl bg-background"
                        disabled={saving}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* STEP 3: Profile Details */}
            {stepInfo.id === "profile" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="apply-salary" className="text-sm font-semibold">Expected Salary (PHP/mo)</Label>
                    <Input
                      id="apply-salary"
                      type="number"
                      placeholder="e.g. 50000"
                      value={formData.expected_salary}
                      onChange={(e) => handleFieldChange("expected_salary", e.target.value)}
                      className="text-sm rounded-xl h-10"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="apply-portfolio" className="text-sm font-semibold">Portfolio / Work Sample URL</Label>
                    <Input
                      id="apply-portfolio"
                      type="url"
                      placeholder="https://your-portfolio.com"
                      value={formData.portfolio_url}
                      onChange={(e) => handleFieldChange("portfolio_url", e.target.value)}
                      className="text-sm rounded-xl h-10"
                      disabled={saving}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Profile Preview</h4>
                  
                  {/* Summary */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Professional Summary</span>
                    <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-xl border whitespace-pre-line">
                      {profileData?.job_seeker_profile?.[0]?.professional_summary || profileData?.job_seeker_profile?.professional_summary || "No professional summary added yet."}
                    </p>
                  </div>

                  {/* Skills */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Core Skills</span>
                    {profileData?.skills && profileData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profileData.skills.map((s: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-normal px-2 py-0.5 rounded-full">
                            {s.skill?.skill_name || s.skill_name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No skills added yet.</p>
                    )}
                  </div>

                  {/* Experience */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Work Experience</span>
                    {profileData?.work_experience && profileData.work_experience.length > 0 ? (
                      <div className="space-y-2">
                        {profileData.work_experience.map((exp: any, i: number) => (
                          <div key={i} className="text-xs border-l-2 border-zinc-200 dark:border-zinc-800 pl-3 py-0.5">
                            <p className="font-semibold text-foreground">{exp.job_title}</p>
                            <p className="text-muted-foreground text-[10px]">{exp.company_name} &bull; {exp.start_date} - {exp.is_current_role ? "Present" : exp.end_date}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No work experience added yet.</p>
                    )}
                  </div>

                  {/* Education */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Educational Background</span>
                    {profileData?.education && profileData.education.length > 0 ? (
                      <div className="space-y-2">
                        {profileData.education.map((edu: any, i: number) => (
                          <div key={i} className="text-xs border-l-2 border-zinc-200 dark:border-zinc-800 pl-3 py-0.5">
                            <p className="font-semibold text-foreground">{edu.course_name || "Course Not Specified"}</p>
                            <p className="text-muted-foreground text-[10px]">{edu.school_name} &bull; {edu.start_date} - {edu.end_date}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No education added yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Review and submit */}
            {stepInfo.id === "review" && (
              <div className="space-y-5">
                <div className="p-4 bg-[#14a800]/5 border border-[#14a800]/25 rounded-xl space-y-1">
                  <h4 className="text-xs font-bold text-[#14a800] uppercase tracking-wider">Review Your Application</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Ensure all your application details are accurate before submitting.
                  </p>
                </div>

                <div className="space-y-4 text-xs border rounded-2xl divide-y bg-muted/10 overflow-hidden">
                  {/* Applicant Details */}
                  <div className="p-4 space-y-1 bg-background">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Applicant</span>
                    <p className="font-bold text-sm text-foreground">
                      {profileData?.user_fname} {profileData?.user_lname}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {profileData?.user_email} &bull; {profileData?.user_contact}
                    </p>
                  </div>

                  {/* Resume & Cover letter */}
                  <div className="p-4 space-y-3 bg-background">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Documents</span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 font-bold text-[9px] rounded-md border border-emerald-200">
                        RESUMÉ
                      </Badge>
                      <span className="text-foreground text-xs font-medium">
                        {formData.custom_resume?.file_name || profileData?.resumes?.[0]?.file_name || "Primary Profile Resume.pdf"}
                      </span>
                      {formData.custom_resume && (
                        <Badge variant="outline" className="text-[9px] border-indigo-200 text-indigo-600">
                          Custom
                        </Badge>
                      )}
                    </div>
                    {(formData.cover_letter || formData.cover_letter_file) && (
                      <div className="space-y-1 mt-1.5">
                        <span className="text-[9px] font-semibold text-muted-foreground block">Cover Letter</span>
                        {formData.cover_letter && (
                          <p className="text-zinc-600 dark:text-zinc-400 italic bg-muted/40 p-3 rounded-xl border line-clamp-4 whitespace-pre-line text-[11px]">
                            {formData.cover_letter}
                          </p>
                        )}
                        {formData.cover_letter_file && (
                          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span>Attached document: {formData.cover_letter_file.file_name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Compensation & Links */}
                  <div className="p-4 grid grid-cols-2 gap-4 bg-background">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Expected Salary</span>
                      <p className="font-semibold text-foreground text-xs mt-0.5">
                        {formData.expected_salary ? `PHP ${Number(formData.expected_salary).toLocaleString()} / mo` : "Not disclosed"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Portfolio URL</span>
                      <p className="font-semibold text-foreground text-xs mt-0.5 truncate">
                        {formData.portfolio_url || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Screening answers */}
                  {hasScreening && (
                    <div className="p-4 space-y-3 bg-background">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Employer Questions Answers</span>
                      {job.screening_questions?.map((question, i) => {
                        const qText = typeof question === "object" && question !== null ? question.question_text : String(question);
                        const aText = formData.screening_answers[i]?.answer_text;
                        return (
                          <div key={i} className="space-y-1 bg-muted/30 p-3 rounded-xl border">
                            <p className="font-semibold text-foreground text-xs">{qText}</p>
                            <p className="text-muted-foreground text-xs whitespace-pre-wrap mt-0.5">
                              {aText || <span className="italic text-zinc-400 text-[11px]">No answer provided</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 flex gap-2 sm:justify-between items-center bg-background">
          <div>
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={saving}
                className="h-9 text-sm rounded-xl gap-1.5 px-4 font-semibold text-zinc-600 border-zinc-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={saving}
                className="h-9 text-sm rounded-xl px-4"
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep < totalSteps ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="h-9 text-sm rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium px-4"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                id="apply-submit-btn"
                onClick={handleSubmit}
                disabled={saving || !!successMessage}
                className="h-9 text-sm rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium px-5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
