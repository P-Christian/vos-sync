import { useState } from 'react';
import { executeUpdateSchoolProfile, executeUploadSchoolLogo } from '../services/school-profile.service';
import { SchoolWithStats, VsSchool } from '@/modules/school-admin/types/school-admin.types';
import { toast } from 'sonner';

export function useSchoolProfile(
  school: SchoolWithStats,
  onUpdateProp?: (data: Partial<VsSchool>) => Promise<boolean>
) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpdate = async (formData: Partial<VsSchool>): Promise<boolean> => {
    setSaving(true);
    try {
      if (onUpdateProp) {
        const success = await onUpdateProp(formData);
        if (success) {
          toast.success('School profile updated successfully');
          setIsEditing(false);
        }
        return success;
      }

      await executeUpdateSchoolProfile(school.school_id, formData);
      toast.success('School profile updated successfully');
      setIsEditing(false);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const url = await executeUploadSchoolLogo(file);
      await handleUpdate({ school_logo_url: url });
      toast.success('Logo updated successfully');
      return url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    isEditing,
    setIsEditing,
    saving,
    uploading,
    handleUpdate,
    handleUploadLogo,
  };
}
