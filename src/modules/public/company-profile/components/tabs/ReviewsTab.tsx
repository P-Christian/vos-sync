"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Star, Plus, CheckCircle, XCircle, X, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicCompanyProfile, CompanyReview } from "../../types";

interface ReviewsTabProps {
  company: PublicCompanyProfile;
}

export function ReviewsTab({ company }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [overallRating, setOverallRating] = useState<number>(0);
  const [workLifeRating, setWorkLifeRating] = useState<number>(0);
  const [compensationRating, setCompensationRating] = useState<number>(0);
  const [managementRating, setManagementRating] = useState<number>(0);
  const [careerGrowthRating, setCareerGrowthRating] = useState<number>(0);
  
  const [employmentStatus, setEmploymentStatus] = useState<"CURRENT_EMPLOYEE" | "FORMER_EMPLOYEE">("CURRENT_EMPLOYEE");
  const [jobTitle, setJobTitle] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [reasonCode, setReasonCode] = useState<"SPAM" | "FALSE_INFORMATION" | "HARASSMENT" | "HATE_SPEECH" | "PERSONAL_INFORMATION" | "CONFIDENTIAL_INFORMATION" | "OFF_TOPIC" | "DUPLICATE" | "FRAUDULENT_CONTENT" | "OTHER">("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportingSubmitting, setReportingSubmitting] = useState(false);

  const refreshReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/public/companies/${company.company_code}/reviews`);
      if (res.ok) {
        const json = await res.json();
        setReviews(json || []);
      }
    } catch (err) {
      console.error("Error fetching company reviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/public/companies/${company.company_code}/reviews`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) {
          setReviews(data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching company reviews:", err);
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [company.company_code]);

  // Aggregate stats
  const totalReviews = reviews.length;
  const avgOverall = totalReviews
    ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews
    : 0;
  
  const avgWorkLife = totalReviews
    ? reviews.reduce((sum, r) => sum + (r.work_life_balance_rating || 0), 0) / reviews.filter(r => r.work_life_balance_rating).length || 0
    : 0;

  const avgCompensation = totalReviews
    ? reviews.reduce((sum, r) => sum + (r.compensation_rating || 0), 0) / reviews.filter(r => r.compensation_rating).length || 0
    : 0;

  const avgManagement = totalReviews
    ? reviews.reduce((sum, r) => sum + (r.management_rating || 0), 0) / reviews.filter(r => r.management_rating).length || 0
    : 0;

  const avgCareerGrowth = totalReviews
    ? reviews.reduce((sum, r) => sum + (r.career_growth_rating || 0), 0) / reviews.filter(r => r.career_growth_rating).length || 0
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overallRating) {
      toast.error("Please provide an overall rating");
      return;
    }
    if (!reviewTitle.trim()) {
      toast.error("Please enter a review title");
      return;
    }
    if (!reviewText.trim()) {
      toast.error("Please fill in the review narrative");
      return;
    }
    if (!pros.trim() || !cons.trim()) {
      toast.error("Pros and Cons details are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/companies/${company.company_code}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employment_status: employmentStatus,
          job_title: jobTitle.trim() || null,
          overall_rating: overallRating,
          work_life_balance_rating: workLifeRating || null,
          compensation_rating: compensationRating || null,
          management_rating: managementRating || null,
          career_growth_rating: careerGrowthRating || null,
          review_title: reviewTitle.trim(),
          pros: pros.trim(),
          cons: cons.trim(),
          review_text: reviewText.trim(),
          is_anonymous: isAnonymous,
        }),
      });

      if (res.status === 401) {
        toast.error("You must be logged in to post a review");
        return;
      }

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Submission failed");
      }

      toast.success("Review submitted! It will appear once approved by a moderator.");
      
      // Reset form
      setOverallRating(0);
      setWorkLifeRating(0);
      setCompensationRating(0);
      setManagementRating(0);
      setCareerGrowthRating(0);
      setJobTitle("");
      setReviewTitle("");
      setPros("");
      setCons("");
      setReviewText("");
      setIsAnonymous(true);
      
      setIsWriteModalOpen(false);
      refreshReviews();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit review";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlagClick = (reviewId: number) => {
    setSelectedReviewId(reviewId);
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewId) return;

    setReportingSubmitting(true);
    try {
      const res = await fetch(`/api/public/companies/${company.company_code}/reviews/${selectedReviewId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason_code: reasonCode,
          report_details: reportDetails.trim() || null,
        }),
      });

      if (res.status === 401) {
        toast.error("You must be logged in to report a review");
        return;
      }

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to submit report");
      }

      toast.success("Thank you. The review has been flagged and is undergoing moderator review.");
      setIsReportModalOpen(false);
      setReportDetails("");
      setReasonCode("SPAM");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit report";
      toast.error(msg);
    } finally {
      setReportingSubmitting(false);
    }
  };

  const renderStarsSelector = (val: number, setVal: (v: number) => void) => {
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setVal(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                star <= val ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-700"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderSubStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-700"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-16">
      {/* 1. Aggregated Summary Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-sm">
        {/* Overall Average */}
        <div className="flex flex-col items-center justify-center text-center md:border-r border-border md:pr-8 py-4">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
            Average Rating
          </span>
          <span className="text-5xl font-extrabold text-foreground mt-2">
            {avgOverall ? avgOverall.toFixed(1) : "0.0"}
          </span>
          <div className="flex items-center gap-1 mt-2 text-amber-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(avgOverall) ? "fill-current text-amber-500" : "text-zinc-300 dark:text-zinc-700"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground mt-3">
            Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </span>
        </div>

        {/* Sub-categories */}
        <div className="space-y-3.5 py-2 md:col-span-2 flex flex-col justify-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Workplace Ratings
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {/* Work-Life */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Work-Life Balance</span>
              <div className="flex items-center gap-2">
                {renderSubStars(Math.round(avgWorkLife))}
                <span className="font-mono text-xs font-bold text-foreground w-6 text-right">
                  {avgWorkLife ? avgWorkLife.toFixed(1) : "0.0"}
                </span>
              </div>
            </div>

            {/* Compensation */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Compensation & Benefits</span>
              <div className="flex items-center gap-2">
                {renderSubStars(Math.round(avgCompensation))}
                <span className="font-mono text-xs font-bold text-foreground w-6 text-right">
                  {avgCompensation ? avgCompensation.toFixed(1) : "0.0"}
                </span>
              </div>
            </div>

            {/* Management */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Culture & Management</span>
              <div className="flex items-center gap-2">
                {renderSubStars(Math.round(avgManagement))}
                <span className="font-mono text-xs font-bold text-foreground w-6 text-right">
                  {avgManagement ? avgManagement.toFixed(1) : "0.0"}
                </span>
              </div>
            </div>

            {/* Growth */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Career Opportunities</span>
              <div className="flex items-center gap-2">
                {renderSubStars(Math.round(avgCareerGrowth))}
                <span className="font-mono text-xs font-bold text-foreground w-6 text-right">
                  {avgCareerGrowth ? avgCareerGrowth.toFixed(1) : "0.0"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls / Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Employee Insight Reviews</h3>
          <p className="text-xs text-muted-foreground">Showing verified employee submissions</p>
        </div>
        <Button
          onClick={() => setIsWriteModalOpen(true)}
          className="rounded-xl font-bold text-sm bg-primary hover:bg-primary/95 text-primary-foreground flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Write a Review
        </Button>
      </div>

      {/* 3. Reviews list */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading employee insights...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="border border-dashed rounded-3xl py-20 px-4 bg-muted/10 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No Reviews Yet</h3>
            <p className="text-sm text-muted-foreground leading-relaxed px-6 mb-6">
              Be the first to share workplace experiences, career growth insights, and culture feedback for this company.
            </p>
            <Button
              onClick={() => setIsWriteModalOpen(true)}
              variant="outline"
              className="rounded-xl font-semibold cursor-pointer"
            >
              Write First Review
            </Button>
          </div>
        ) : (
          reviews.map((rev) => {
            const reviewerRole = rev.is_anonymous ? "Anonymous Employee" : (rev.job_title || "Employee");
            const statusLabel = rev.employment_status === "CURRENT_EMPLOYEE" ? "Current Employee" : "Former Employee";
            return (
              <div
                key={rev.review_id}
                className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-sm hover:border-border/80 transition-all"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-4 flex-wrap border-b border-border/40 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-lg text-xs">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {Number(rev.overall_rating || 0).toFixed(1)}
                      </div>
                      {rev.review_title && (
                        <h4 className="font-bold text-foreground text-base">&ldquo;{rev.review_title}&rdquo;</h4>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block">
                      {reviewerRole} &bull; {statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleFlagClick(rev.review_id)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                      title="Report Review"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-ratings details */}
                {(rev.work_life_balance_rating || rev.compensation_rating || rev.management_rating || rev.career_growth_rating) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-2xl text-xs border border-border/40">
                    {rev.work_life_balance_rating && (
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Work-Life</span>
                        {renderSubStars(rev.work_life_balance_rating)}
                      </div>
                    )}
                    {rev.compensation_rating && (
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Compensation</span>
                        {renderSubStars(rev.compensation_rating)}
                      </div>
                    )}
                    {rev.management_rating && (
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Management</span>
                        {renderSubStars(rev.management_rating)}
                      </div>
                    )}
                    {rev.career_growth_rating && (
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Growth</span>
                        {renderSubStars(rev.career_growth_rating)}
                      </div>
                    )}
                  </div>
                )}

                {/* Review descriptions */}
                <div className="space-y-3.5">
                  {rev.review_text && (
                    <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                      {rev.review_text}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-4 text-xs leading-relaxed">
                    {rev.pros && (
                      <div className="flex items-start gap-2 bg-emerald-50/20 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-500/10">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-foreground">Pros:</span>{" "}
                          <span className="text-muted-foreground block mt-0.5">{rev.pros}</span>
                        </div>
                      </div>
                    )}
                    {rev.cons && (
                      <div className="flex items-start gap-2 bg-rose-50/20 dark:bg-rose-950/10 p-3 rounded-xl border border-rose-500/10">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-foreground">Cons:</span>{" "}
                          <span className="text-muted-foreground block mt-0.5">{rev.cons}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Write a Review Modal */}
      <Dialog open={isWriteModalOpen} onOpenChange={(open) => !open && setIsWriteModalOpen(false)}>
        <DialogContent className="sm:max-w-2xl w-[92vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-900 border shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Write a Review</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Share your employee insights for {company.company_name}
              </DialogDescription>
            </div>
            <button
              onClick={() => setIsWriteModalOpen(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Overall Star Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Overall Rating <span className="text-rose-500">*</span>
              </label>
              {renderStarsSelector(overallRating, setOverallRating)}
            </div>

            {/* Sub-ratings grid */}
            <div className="p-4 bg-muted/20 rounded-2xl border border-border space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Detailed Workplace Ratings (Optional)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Work Life */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Work-Life Balance</span>
                  {renderStarsSelector(workLifeRating, setWorkLifeRating)}
                </div>

                {/* Compensation */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Compensation & Benefits</span>
                  {renderStarsSelector(compensationRating, setCompensationRating)}
                </div>

                {/* Management */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Culture & Management</span>
                  {renderStarsSelector(managementRating, setManagementRating)}
                </div>

                {/* Growth */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Career Opportunities</span>
                  {renderStarsSelector(careerGrowthRating, setCareerGrowthRating)}
                </div>
              </div>
            </div>

            {/* Employment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Employment Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as "CURRENT_EMPLOYEE" | "FORMER_EMPLOYEE")}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-sm font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="CURRENT_EMPLOYEE">Current Employee</option>
                  <option value="FORMER_EMPLOYEE">Former Employee</option>
                </select>
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Job Title
                </label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="rounded-xl border border-border bg-background p-2.5 text-sm text-foreground"
                />
              </div>
            </div>

            {/* Review Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Review Title <span className="text-rose-500">*</span>
              </label>
              <Input
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="e.g. Great working environment and mentorship"
                className="rounded-xl border border-border bg-background p-2.5 text-sm text-foreground"
                required
              />
            </div>

            {/* Pros / Cons grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pros */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Pros <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  value={pros}
                  onChange={(e) => setPros(e.target.value)}
                  placeholder="What do you like about this company?"
                  className="rounded-xl border border-border bg-background p-2.5 text-sm text-foreground min-h-[90px]"
                  required
                />
              </div>

              {/* Cons */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  Cons <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  value={cons}
                  onChange={(e) => setCons(e.target.value)}
                  placeholder="What could be improved?"
                  className="rounded-xl border border-border bg-background p-2.5 text-sm text-foreground min-h-[90px]"
                  required
                />
              </div>
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Overall workplace feedback <span className="text-rose-500">*</span>
              </label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your general thoughts about your workplace experience here..."
                className="rounded-xl border border-border bg-background p-2.5 text-sm text-foreground min-h-[110px]"
                required
              />
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center space-x-3 bg-muted/20 p-4 rounded-xl border border-border/40">
              <Checkbox
                id="isAnonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(!!checked)}
              />
              <label
                htmlFor="isAnonymous"
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none leading-none"
              >
                Submit anonymously (Your job title will be shown but not your identity)
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWriteModalOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl font-bold text-xs bg-primary hover:bg-primary/95 text-primary-foreground flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Review
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Flag className="w-5 h-5 text-rose-500 fill-rose-500/10" />
              Report Review
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Help us understand what is wrong with this review. Flagged reviews are sent to the moderation team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reason for reporting <span className="text-rose-500">*</span>
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as "SPAM" | "FALSE_INFORMATION" | "HARASSMENT" | "HATE_SPEECH" | "PERSONAL_INFORMATION" | "CONFIDENTIAL_INFORMATION" | "OFF_TOPIC" | "DUPLICATE" | "FRAUDULENT_CONTENT" | "OTHER")}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-sm font-semibold text-foreground focus:ring-1 focus:ring-rose-500 focus:outline-none"
              >
                <option value="SPAM">Spam</option>
                <option value="FALSE_INFORMATION">False or misleading information</option>
                <option value="HARASSMENT">Harassment or bullying</option>
                <option value="HATE_SPEECH">Hate speech or discrimination</option>
                <option value="PERSONAL_INFORMATION">Personal identifying details</option>
                <option value="CONFIDENTIAL_INFORMATION">Confidential or proprietary data</option>
                <option value="OFF_TOPIC">Off-topic content</option>
                <option value="DUPLICATE">Duplicate submission</option>
                <option value="FRAUDULENT_CONTENT">Fake or fraudulent review</option>
                <option value="OTHER">Other violation</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Optional Details
              </label>
              <Textarea
                placeholder="Provide additional details or context (optional)..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="rounded-xl border border-border bg-background p-3 text-sm focus:ring-1 focus:ring-rose-500 min-h-[100px]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-xl font-semibold text-sm cursor-pointer"
                disabled={reportingSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={reportingSubmitting}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm px-5 cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {reportingSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Report
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
