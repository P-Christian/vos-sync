/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SchoolWithStats, VsSchool } from "@/modules/school-admin/types/school-admin.types";
import { 
  Loader2, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Camera, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  FileText, 
  Building,
  Edit3,
  X,
  Save
} from "lucide-react";
import { useSchoolProfile } from "./hooks/useSchoolProfile";
import { SchoolAdminModuleHeader } from "@/modules/school-admin/components/SchoolAdminModuleHeader";
import { Badge } from "@/components/ui/badge";
import { formatSchoolAddress } from "./services/school-profile.helpers";

export function SchoolProfilePage({ 
  school, 
  onUpdate 
}: { 
  school: SchoolWithStats,
  onUpdate: (data: Partial<VsSchool>) => Promise<boolean>
}) {
  const {
    isEditing,
    setIsEditing,
    saving,
    uploading,
    handleUpdate,
    handleUploadLogo,
  } = useSchoolProfile(school, onUpdate);

  const [formData, setFormData] = useState<Partial<VsSchool>>({
    school_name: school.school_name || "",
    school_type: school.school_type || "University",
    school_email: school.school_email || "",
    school_contact_no: school.school_contact_no || "",
    school_website: school.school_website || "",
    school_logo_url: school.school_logo_url || "",
    school_description: school.school_description || "",
    address_line: school.address_line || "",
    barangay: school.barangay || "",
    city_municipality: school.city_municipality || "",
    province: school.province || "",
    postal_code: school.postal_code || "",
    country: school.country || "",
  });

  useEffect(() => {
    if (!isEditing) {
      setFormData({
        school_name: school.school_name || "",
        school_type: school.school_type || "University",
        school_email: school.school_email || "",
        school_contact_no: school.school_contact_no || "",
        school_website: school.school_website || "",
        school_logo_url: school.school_logo_url || "",
        school_description: school.school_description || "",
        address_line: school.address_line || "",
        barangay: school.barangay || "",
        city_municipality: school.city_municipality || "",
        province: school.province || "",
        postal_code: school.postal_code || "",
        country: school.country || "",
      });
    }
  }, [school, isEditing]);

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUploadLogo(file);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleUpdate(formData);
  };

  const completion = school.profile_completion_percent || 0;
  const formattedAddress = formatSchoolAddress(formData);

  return (
    <div className="w-[90%] max-w-[2000px] mx-auto space-y-6">
      {/* Module Header Banner */}
      <SchoolAdminModuleHeader
        title="School Profile Settings"
        description="Manage your institution's profile, contact details, address, and public branding."
        icon={Building2}
        actions={
          !isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                type="button"
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:text-white flex items-center gap-1.5" 
                onClick={() => setIsEditing(false)} 
                disabled={saving}
              >
                <X className="w-4 h-4 text-white" />
                <span className="text-white">Cancel</span>
              </Button>
              <Button 
                onClick={onSubmit} 
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          )
        }
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Identity Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardContent className="p-6 space-y-6">
              {/* Logo & Basic Info Header */}
              <div className="flex items-start gap-4">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl border bg-card shadow-sm flex items-center justify-center overflow-hidden">
                    {formData.school_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={formData.school_logo_url} 
                        alt={formData.school_name || "School Logo"} 
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Building2 className="w-9 h-9 text-muted-foreground" />
                    )}
                  </div>

                  {isEditing && (
                    <label 
                      htmlFor="logo-upload-input" 
                      className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mb-0.5" />
                          <span className="text-[9px] font-medium">Upload</span>
                        </>
                      )}
                      <input 
                        id="logo-upload-input" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={onLogoChange}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    <Badge variant={school.school_status === "Active" ? "default" : "secondary"} className="capitalize text-[10px] px-2 py-0">
                      {school.school_status}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-[10px] px-2 py-0">
                      {school.school_type}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight leading-snug">
                    {school.school_name || "Institution Name"}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    <span className="truncate">{formData.city_municipality ? `${formData.city_municipality}, ${formData.province}` : "Location not set"}</span>
                  </p>
                </div>
              </div>

              {/* Profile Completion Bar */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-muted-foreground">Profile Completion</span>
                  <span className="font-bold text-foreground">{completion}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="p-3 rounded-xl bg-muted/50 border flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Courses</p>
                    <p className="text-lg font-bold text-foreground">{school.course_count}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Students</p>
                    <p className="text-lg font-bold text-foreground">{school.student_count}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Card Summary (Read-Only Preview) */}
          <Card className="border shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                Quick Contact & Web
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate text-foreground font-medium">{formData.school_email || "No email provided"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-foreground font-medium">{formData.school_contact_no || "No phone provided"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                {formData.school_website ? (
                  <a 
                    href={formData.school_website.startsWith('http') ? formData.school_website : `https://${formData.school_website}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-600 hover:underline truncate font-medium"
                  >
                    {formData.school_website}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No website provided</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Details / Edit Form Area */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* General Info Card */}
            <Card className="border shadow-sm rounded-2xl">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">General Information</CardTitle>
                    <CardDescription>Basic details about your educational institution.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="school_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      School Name
                    </Label>
                    <Input 
                      id="school_name" 
                      value={formData.school_name || ""} 
                      onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="school_type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Institution Type
                    </Label>
                    <Select 
                      value={formData.school_type} 
                      onValueChange={(val: any) => setFormData({ ...formData, school_type: val })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="University">University</SelectItem>
                        <SelectItem value="College">College</SelectItem>
                        <SelectItem value="Technical/Vocational">Technical/Vocational</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="school_email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Official Email
                    </Label>
                    <Input 
                      id="school_email" 
                      type="email"
                      value={formData.school_email || ""} 
                      onChange={(e) => setFormData({ ...formData, school_email: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="school_contact_no" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Contact Number
                    </Label>
                    <Input 
                      id="school_contact_no" 
                      value={formData.school_contact_no || ""} 
                      onChange={(e) => setFormData({ ...formData, school_contact_no: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="school_website" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Website URL
                    </Label>
                    <Input 
                      id="school_website" 
                      value={formData.school_website || ""} 
                      onChange={(e) => setFormData({ ...formData, school_website: e.target.value })}
                      disabled={!isEditing}
                      placeholder="https://example.edu.ph"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="school_description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    About / Description
                  </Label>
                  <Textarea 
                    id="school_description" 
                    rows={4}
                    value={formData.school_description || ""} 
                    onChange={(e) => setFormData({ ...formData, school_description: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Provide a summary of your school background, mission, and programs..."
                    className="rounded-xl resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address Information Card */}
            <Card className="border shadow-sm rounded-2xl">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Location & Address Details</CardTitle>
                    <CardDescription>Address specification for campus location and correspondence.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address_line" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Street Address / Building
                    </Label>
                    <Input 
                      id="address_line" 
                      value={formData.address_line || ""} 
                      onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barangay" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Barangay
                    </Label>
                    <Input 
                      id="barangay" 
                      value={formData.barangay || ""} 
                      onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city_municipality" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      City / Municipality
                    </Label>
                    <Input 
                      id="city_municipality" 
                      value={formData.city_municipality || ""} 
                      onChange={(e) => setFormData({ ...formData, city_municipality: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="province" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Province
                    </Label>
                    <Input 
                      id="province" 
                      value={formData.province || ""} 
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Postal Code
                    </Label>
                    <Input 
                      id="postal_code" 
                      value={formData.postal_code || ""} 
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
