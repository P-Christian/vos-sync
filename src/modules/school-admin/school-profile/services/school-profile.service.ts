import { updateSchoolProfileRepo, uploadSchoolLogoRepo } from './school-profile.repo';
import { sanitizeWebsiteUrl } from './school-profile.helpers';
import { updateSchoolProfileSchema } from '../types/school-profile.schema';
import { VsSchool } from '@/modules/school-admin/types/school-admin.types';

export async function executeUpdateSchoolProfile(schoolId: number, data: Partial<VsSchool>): Promise<VsSchool> {
  const payload = {
    ...data,
    school_website: data.school_website ? sanitizeWebsiteUrl(data.school_website) : data.school_website
  };

  const parsed = updateSchoolProfileSchema.partial().safeParse(payload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || 'Validation error';
    throw new Error(errorMsg);
  }

  return await updateSchoolProfileRepo(schoolId, payload);
}

export async function executeUploadSchoolLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size should not exceed 5MB');
  }

  return await uploadSchoolLogoRepo(file);
}
