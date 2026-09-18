// src/modules/school-admin/school-profile/SchoolProfilePage.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  MapPin, 
  Pencil, 
  Globe, 
  Eye, 
  ShieldCheck, 
  GraduationCap, 
  Loader2,
  Save,
  X,
  FileText
} from "lucide-react";
import { SchoolWithStats, VsSchool } from "@/modules/school-admin/types/school-admin.types";
import { EditableSchoolFields } from "./types/school-profile.types";
import SchoolBasicInfo from "./components/SchoolBasicInfo";
import SchoolAddress from "./components/SchoolAddress";
import SchoolCompletionBar from "./components/SchoolCompletionBar";
import SchoolStatusCard from "./components/SchoolStatusCard";
import SchoolDocuments from "./components/SchoolDocuments";
import SchoolMetricsWidget from "./components/SchoolMetricsWidget";
import SchoolPreviewModal from "./components/SchoolPreviewModal";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

interface SchoolProfilePageProps {
  school: SchoolWithStats;
  onUpdate: (data: Partial<VsSchool>) => Promise<boolean>;
}

export function SchoolProfilePage({
  school,
  onUpdate,
}: SchoolProfilePageProps) {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<EditableSchoolFields>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Sync draft from school data
  const populateDraftFromSchool = () => {
    return {
      school_name: school.school_name ?? "",
      school_type: school.school_type ?? "University",
      school_logo_url: school.school_logo_url ?? "",
      school_cover: school.school_cover ?? "",
      school_description: school.school_description ?? "",
      school_mission: school.school_mission ?? "",
      school_values: school.school_values ?? "",
      school_email: school.school_email ?? "",
      school_contact_no: school.school_contact_no ?? "",
      school_website: school.school_website ?? "",
      school_facebook: school.school_facebook ?? "",
      school_linkedin: school.school_linkedin ?? "",
      address_line: school.address_line ?? "",
      barangay: school.barangay ?? "",
      city_municipality: school.city_municipality ?? "",
      province: school.province ?? "",
      postal_code: school.postal_code ?? "",
      country: school.country ?? "Philippines",
      is_public: school.is_public ?? false,
    };
  };

  // Section edit handlers
  const handleEditInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft((prev) => ({
      ...populateDraftFromSchool(),
      ...prev,
    }));
    setIsEditingInfo(true);
  };

  const handleSaveInfo = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      const payload: Partial<VsSchool> = {
        school_name: draft.school_name,
        school_type: draft.school_type,
        school_logo_url: draft.school_logo_url,
        school_cover: draft.school_cover,
        school_description: draft.school_description,
        school_mission: draft.school_mission,
        school_values: draft.school_values,
        school_email: draft.school_email,
        school_contact_no: draft.school_contact_no,
        school_website: draft.school_website,
        school_facebook: draft.school_facebook,
        school_linkedin: draft.school_linkedin,
      };
      const success = await onUpdate(payload);
      if (success) {
        toast.success("School information saved successfully.");
        setIsEditingInfo(false);
        if (!isEditingAddress) setDraft({});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update school information.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingInfo(false);
    if (!isEditingAddress) setDraft({});
  };

  const handleEditAddress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft((prev) => ({
      ...populateDraftFromSchool(),
      ...prev,
    }));
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      const payload: Partial<VsSchool> = {
        address_line: draft.address_line,
        barangay: draft.barangay,
        city_municipality: draft.city_municipality,
        province: draft.province,
        postal_code: draft.postal_code,
        country: draft.country || "Philippines",
      };
      const success = await onUpdate(payload);
      if (success) {
        toast.success("Campus address saved successfully.");
        setIsEditingAddress(false);
        if (!isEditingInfo) setDraft({});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update campus address.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAddress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingAddress(false);
    if (!isEditingInfo) setDraft({});
  };

  const handleFieldChange = (
    field: keyof EditableSchoolFields,
    value: string | boolean | number
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleVisibility = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      const nextVal = Number(school.is_public) === 1 ? 0 : 1;
      await onUpdate({ is_public: nextVal });
      toast.success(`Profile set to ${nextVal === 1 ? "Public" : "Private"}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update visibility.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const displayDataInfo = isEditingInfo
    ? { ...school, ...draft }
    : school;

  const displayDataAddress = isEditingAddress
    ? { ...school, ...draft }
    : school;

  const completionPercent = school.profile_completion_percent || 0;
  const isPublic = Number(school.is_public) === 1 || school.is_public === true;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-[92%] max-w-[2000px] mx-auto space-y-6 pb-12"
    >
      {/* ── Main 2-Column Grid (Starts directly without redundant gradient header) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Left Column (Main Profile Details) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: School Information */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border border-border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border px-6 py-4 bg-muted/20 flex flex-row justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                    School Information
                  </CardTitle>
                </div>

                {!isEditingInfo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary font-semibold hover:bg-primary/10 transition-colors gap-1.5"
                    onClick={handleEditInfo}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit Info</span>
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {isEditingInfo ? (
                    <motion.div
                      key="editing-info"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-6"
                    >
                      <SchoolBasicInfo
                        data={displayDataInfo}
                        onChange={handleFieldChange}
                        readOnly={false}
                      />
                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelInfo}
                          disabled={saving}
                          className="h-9 px-5 text-xs font-medium rounded-xl"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveInfo}
                          size="sm"
                          disabled={saving}
                          className="h-9 px-6 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-transform active:scale-[0.98] gap-1.5"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view-info"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SchoolBasicInfo
                        data={school}
                        onChange={() => {}}
                        readOnly={true}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2: Campus Address & Location */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border border-border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border px-6 py-4 bg-muted/20 flex flex-row justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Campus Location & Address
                  </CardTitle>
                </div>

                {!isEditingAddress && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary font-semibold hover:bg-primary/10 transition-colors gap-1.5"
                    onClick={handleEditAddress}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit Address</span>
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {isEditingAddress ? (
                    <motion.div
                      key="editing-address"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-6"
                    >
                      <SchoolAddress
                        data={displayDataAddress}
                        onChange={handleFieldChange}
                        readOnly={false}
                      />
                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelAddress}
                          disabled={saving}
                          className="h-9 px-5 text-xs font-medium rounded-xl"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveAddress}
                          size="sm"
                          disabled={saving}
                          className="h-9 px-6 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-transform active:scale-[0.98] gap-1.5"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view-address"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SchoolAddress
                        data={school}
                        onChange={() => {}}
                        readOnly={true}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Right Column (Sidebar Widgets) ── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Widget 1: Profile Completion Bar */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border border-border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
              <CardContent className="p-5">
                <SchoolCompletionBar percent={completionPercent} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Widget 2: Verification Status */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border border-border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border px-5 py-3.5 bg-muted/20 flex flex-row items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <SchoolStatusCard
                  status={school.verification_status}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Widget 3: Verification Documents (Dedicated Component between Status and Metrics) */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border border-border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border px-5 py-3.5 bg-muted/20 flex flex-row items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Verification Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <SchoolDocuments schoolId={school.school_id} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Widget 4: Academic Quick Metrics */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border border-border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border px-5 py-3.5 bg-muted/20 flex flex-row items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Institutional Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <SchoolMetricsWidget
                  courseCount={school.course_count}
                  studentCount={school.student_count}
                  schoolType={school.school_type}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Widget 5: Public Profile Preview Button */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border border-border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border px-5 py-3.5 bg-muted/20 flex flex-row items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Public Profile Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Preview how prospective students, education partners, and organizations see your school profile.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPreview(true);
                  }}
                  className="w-full h-9 text-xs font-semibold rounded-xl hover:border-primary/50 gap-1.5 transition-colors"
                >
                  <Eye className="h-4 w-4 text-primary" />
                  Preview Public Profile
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Widget 6: Public Visibility Settings */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border border-border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border px-5 py-3.5 bg-muted/20 flex flex-row items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Public Visibility
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {isPublic ? "Public Profile" : "Private Profile"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {isPublic
                        ? "Discoverable by partners and visible on school listings."
                        : "Only visible to authorized school administrators."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={handleToggleVisibility}
                    className="h-8 px-3 text-[11px] font-semibold rounded-xl shrink-0 hover:border-primary/50 transition-colors"
                  >
                    {isPublic ? "Make Private" : "Make Public"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Public Profile Preview Modal */}
      <SchoolPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        school={school}
      />
    </motion.div>
  );
}
export default SchoolProfilePage;
