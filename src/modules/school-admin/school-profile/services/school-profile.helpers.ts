import { SchoolProfileData, UpdateSchoolProfileDTO } from '../types/school-profile.types';

export function formatSchoolAddress(data: Partial<SchoolProfileData>): string {
  const parts = [
    data.address_line,
    data.barangay,
    data.city_municipality,
    data.province,
    data.postal_code,
    data.country
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No address provided';
}

export function sanitizeWebsiteUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeProfileFormData(school: Partial<SchoolProfileData>): UpdateSchoolProfileDTO {
  return {
    school_name: school.school_name || '',
    school_type: school.school_type || 'University',
    school_email: school.school_email || '',
    school_contact_no: school.school_contact_no || '',
    school_website: school.school_website || '',
    school_logo_url: school.school_logo_url || '',
    school_description: school.school_description || '',
    address_line: school.address_line || '',
    barangay: school.barangay || '',
    city_municipality: school.city_municipality || '',
    province: school.province || '',
    postal_code: school.postal_code || '',
    country: school.country || '',
  };
}
