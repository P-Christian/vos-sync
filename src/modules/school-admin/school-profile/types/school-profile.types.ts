// src/modules/school-admin/school-profile/types/school-profile.types.ts
import { SchoolType, SchoolStatus, VerificationStatus, VsSchool } from '../../types/school-admin.types';

export interface SchoolProfileData extends VsSchool {}

export type EditableSchoolFields = Pick<
  VsSchool,
  | 'school_name'
  | 'school_type'
  | 'school_logo_url'
  | 'school_cover'
  | 'school_description'
  | 'school_mission'
  | 'school_values'
  | 'school_email'
  | 'school_contact_no'
  | 'school_website'
  | 'school_facebook'
  | 'school_linkedin'
  | 'address_line'
  | 'barangay'
  | 'city_municipality'
  | 'province'
  | 'postal_code'
  | 'country'
  | 'is_public'
>;

export interface UpdateSchoolProfileDTO extends Partial<EditableSchoolFields> {}

export type SchoolDocumentTypeKey =
  | 'CHED_DEPED_TESDA_RECOGNITION'
  | 'BUSINESS_PERMIT'
  | 'TIN_DOCUMENT'
  | 'OTHER_DOCUMENT';

export interface UploadedSchoolDoc {
  id: string;
  school_document_id?: number | string;
  document_type: string;
  name: string;
  size: number;
  uploaded_at?: string | null;
}
