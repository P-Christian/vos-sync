// src/modules/school-admin/school-profile/hooks/useSchoolProfile.ts
import { useState } from 'react';
import { executeUpdateSchoolProfile, executeUploadSchoolLogo, executeUploadSchoolCover } from '../services/school-profile.service';
import { SchoolWithStats, VsSchool } from '@/modules/school-admin/types/school-admin.types';
import { toast } from 'sonner';

export function useSchoolProfile(
  school: SchoolWithStats,
  onUpdateProp?: (data: Partial<VsSchool>) => Promise<boolean>
) {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateProfile = async (formData: Partial<VsSchool>): Promise<boolean> => {
    setSaving(true);
    try {
      if (onUpdateProp) {
        const success = await onUpdateProp(formData);
        if (success) {
          toast.success('School profile updated successfully');
        }
        return success;
      }

      await executeUpdateSchoolProfile(school.school_id, formData);
      toast.success('School profile updated successfully');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update school profile';
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const url = await executeUploadSchoolLogo(file);
      toast.success('School logo uploaded successfully.');
      return url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload school logo';
      toast.error(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadCover = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const url = await executeUploadSchoolCover(file);
      toast.success('Cover image uploaded successfully.');
      return url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload cover photo';
      toast.error(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    isEditingInfo,
    setIsEditingInfo,
    isEditingAddress,
    setIsEditingAddress,
    saving,
    uploading,
    updateProfile,
    uploadLogo,
    uploadCover,
  };
}
