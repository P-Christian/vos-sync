"use client";

// src/modules/client/settings/components/AccountSettings.tsx

import React, { useMemo, useState, useRef } from "react";
import { UserProfile } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  User,
  Mail,
  Phone,
  Briefcase,
  CheckCircle,
  Camera,
  MapPin,
  Calendar,
  Heart,
  Trash2,
} from "lucide-react";
import ImageCropModal from "../../company-profile/components/ImageCropModal";

interface AccountSettingsProps {
  user: UserProfile | null;
  saving: boolean;
  onSave: (data: Partial<UserProfile>) => Promise<boolean>;
}

function getImageUrl(val?: string | null): string {
  if (!val) return "";
  if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) return val;
  return `/api/client/assets/${val}`;
}

function getInitials(fname?: string, lname?: string): string {
  const f = fname?.[0] ?? "";
  const l = lname?.[0] ?? "";
  return (f + l).toUpperCase() || "U";
}

export default function AccountSettings({
  user,
  saving,
  onSave,
}: AccountSettingsProps) {
  const [overrides, setOverrides] = useState<Partial<UserProfile>>({});
  
  // Image crop & upload state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formData = useMemo(
    () => ({
      user_fname: overrides.user_fname ?? user?.user_fname ?? "",
      user_mname: overrides.user_mname ?? user?.user_mname ?? "",
      user_lname: overrides.user_lname ?? user?.user_lname ?? "",
      suffix_name: overrides.suffix_name ?? user?.suffix_name ?? "",
      nickname: overrides.nickname ?? user?.nickname ?? "",
      user_email: user?.user_email ?? "", // Read-only primary email
      user_contact: overrides.user_contact ?? user?.user_contact ?? "",
      user_position: overrides.user_position ?? user?.user_position ?? "",
      user_province: overrides.user_province ?? user?.user_province ?? "",
      user_city: overrides.user_city ?? user?.user_city ?? "",
      user_brgy: overrides.user_brgy ?? user?.user_brgy ?? "",
      gender: overrides.gender ?? user?.gender ?? "",
      user_bday: overrides.user_bday ?? user?.user_bday ?? "",
      civil_status: overrides.civil_status ?? user?.civil_status ?? "",
      profile_image_url: overrides.profile_image_url ?? user?.profile_image_url ?? "",
    }),
    [user, overrides]
  );

  const handleChange = (field: keyof UserProfile, value: string) => {
    setOverrides((prev) => ({ ...prev, [field]: value }));
  };

  // Image Upload Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmCrop = async (croppedFile: File) => {
    setUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", croppedFile);

      const res = await fetch("/api/client/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image.");
      }

      const fileObj = await res.json();
      const newImageUrl = fileObj.id || fileObj.filename_disk || fileObj.url;

      setOverrides((prev) => ({ ...prev, profile_image_url: newImageUrl }));
      await onSave({ profile_image_url: newImageUrl });
      setCropModalOpen(false);
      setSelectedImageSrc(null);
    } catch (err) {
      console.error("Photo upload error:", err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;
    setOverrides((prev) => ({ ...prev, profile_image_url: "" }));
    await onSave({ profile_image_url: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSave({
      user_fname: formData.user_fname,
      user_mname: formData.user_mname,
      user_lname: formData.user_lname,
      suffix_name: formData.suffix_name,
      nickname: formData.nickname,
      user_contact: formData.user_contact,
      user_position: formData.user_position,
      user_province: formData.user_province,
      user_city: formData.user_city,
      user_brgy: formData.user_brgy,
      gender: formData.gender,
      user_bday: formData.user_bday,
      civil_status: formData.civil_status,
      profile_image_url: formData.profile_image_url,
    });
    if (ok) {
      setOverrides({});
    }
  };

  const avatarSrc = getImageUrl(formData.profile_image_url);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={selectedImageSrc}
        type="company_logo"
        onCancel={() => {
          setCropModalOpen(false);
          setSelectedImageSrc(null);
        }}
        onConfirm={handleConfirmCrop}
        uploading={uploadingImage}
      />

      {/* Section 1: Profile Photo & Basic Identity */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Account Photo &amp; Basic Info
        </h3>

        {/* Profile Avatar Header */}
        <div className="flex items-center gap-5 p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full border-2 border-white dark:border-zinc-800 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xl flex items-center justify-center overflow-hidden shadow-sm">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(formData.user_fname, formData.user_lname)
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 bg-[#14a800] hover:bg-[#118f00] text-white rounded-full shadow-md transition-transform hover:scale-105"
              title="Change Profile Photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {formData.user_fname} {formData.user_lname}
              </h4>
              {formData.nickname && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                  &quot;{formData.nickname}&quot;
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              PNG, JPG or WebP. Max 5MB. Photo will be displayed on team views and candidate sheets.
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs font-semibold rounded-lg border-zinc-200 dark:border-zinc-700"
              >
                Upload New Photo
              </Button>
              {avatarSrc && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="h-8 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Name Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fname" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-zinc-400" /> First Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="fname"
              value={formData.user_fname}
              onChange={(e) => handleChange("user_fname", e.target.value)}
              placeholder="First name"
              className="h-10 text-sm rounded-lg"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mname" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Middle Name <span className="text-zinc-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="mname"
              value={formData.user_mname}
              onChange={(e) => handleChange("user_mname", e.target.value)}
              placeholder="Middle name"
              className="h-10 text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lname" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Last Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="lname"
              value={formData.user_lname}
              onChange={(e) => handleChange("user_lname", e.target.value)}
              placeholder="Last name"
              className="h-10 text-sm rounded-lg"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="suffix_name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Suffix Name <span className="text-zinc-400 font-normal">(Optional, e.g. Jr., Sr., III)</span>
            </Label>
            <Input
              id="suffix_name"
              value={formData.suffix_name}
              onChange={(e) => handleChange("suffix_name", e.target.value)}
              placeholder="Jr. / III"
              className="h-10 text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nickname" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Nickname <span className="text-zinc-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => handleChange("nickname", e.target.value)}
              placeholder="Preferred name"
              className="h-10 text-sm rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Contact & Position */}
      <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Contact &amp; Work Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-400" /> Account Email address
            </Label>
            <Input
              id="email"
              value={formData.user_email}
              disabled
              className="h-10 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800/50 cursor-not-allowed text-zinc-500"
            />
            <span className="text-[11px] text-zinc-400">Primary login email cannot be changed directly.</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-zinc-400" /> Contact Number
            </Label>
            <Input
              id="contact"
              value={formData.user_contact}
              onChange={(e) => handleChange("user_contact", e.target.value)}
              placeholder="+63 912 345 6789"
              className="h-10 text-sm rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="position" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-zinc-400" /> Job Title / Position
          </Label>
          <Input
            id="position"
            value={formData.user_position}
            onChange={(e) => handleChange("user_position", e.target.value)}
            placeholder="HR Director / Talent Acquisition Lead"
            className="h-10 text-sm rounded-lg max-w-md"
          />
        </div>
      </div>

      {/* Section 3: Address Information */}
      <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-zinc-400" /> Location &amp; Address
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="province" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Province
            </Label>
            <Input
              id="province"
              value={formData.user_province}
              onChange={(e) => handleChange("user_province", e.target.value)}
              placeholder="e.g. Metro Manila / Cavite"
              className="h-10 text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              City / Municipality
            </Label>
            <Input
              id="city"
              value={formData.user_city}
              onChange={(e) => handleChange("user_city", e.target.value)}
              placeholder="e.g. Makati City"
              className="h-10 text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brgy" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Barangay
            </Label>
            <Input
              id="brgy"
              value={formData.user_brgy}
              onChange={(e) => handleChange("user_brgy", e.target.value)}
              placeholder="e.g. Brgy. Bel-Air"
              className="h-10 text-sm rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Personal Details */}
      <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Personal Information <span className="text-zinc-400 font-normal">(Optional)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bday" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Date of Birth
            </Label>
            <Input
              id="bday"
              type="date"
              value={formData.user_bday ? formData.user_bday.slice(0, 10) : ""}
              onChange={(e) => handleChange("user_bday", e.target.value)}
              className="h-10 text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gender" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Gender
            </Label>
            <Select
              value={formData.gender || "unspecified"}
              onValueChange={(val) => handleChange("gender", val === "unspecified" ? "" : val)}
            >
              <SelectTrigger id="gender" className="h-10 text-sm rounded-lg border-zinc-200">
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified" className="text-sm">Prefer not to say</SelectItem>
                <SelectItem value="Male" className="text-sm">Male</SelectItem>
                <SelectItem value="Female" className="text-sm">Female</SelectItem>
                <SelectItem value="Non-Binary" className="text-sm">Non-Binary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="civil_status" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-zinc-400" /> Civil Status
            </Label>
            <Select
              value={formData.civil_status || "unspecified"}
              onValueChange={(val) => handleChange("civil_status", val === "unspecified" ? "" : val)}
            >
              <SelectTrigger id="civil_status" className="h-10 text-sm rounded-lg border-zinc-200">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified" className="text-sm">Select Status</SelectItem>
                <SelectItem value="Single" className="text-sm">Single</SelectItem>
                <SelectItem value="Married" className="text-sm">Married</SelectItem>
                <SelectItem value="Widowed" className="text-sm">Widowed</SelectItem>
                <SelectItem value="Separated" className="text-sm">Separated</SelectItem>
                <SelectItem value="Divorced" className="text-sm">Divorced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <Button
          type="submit"
          disabled={saving}
          className="h-10 px-7 text-sm rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-medium shadow-sm flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Save Account Profile
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

