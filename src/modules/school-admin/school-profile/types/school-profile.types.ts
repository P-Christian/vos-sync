import { SchoolType, SchoolStatus } from '../../types/school-admin.types';

export interface SchoolProfileData {
  school_id: number;
  school_name: string;
  school_type: SchoolType;
  school_logo_url: string | null;
  school_description: string | null;
  school_email: string | null;
  school_contact_no: string | null;
  school_website: string | null;
  address_line: string | null;
  barangay: string | null;
  city_municipality: string;
  province: string;
  postal_code: string | null;
  country: string;
  school_status: SchoolStatus;
  profile_completion_percent: number;
}

export interface UpdateSchoolProfileDTO {
  school_name?: string;
  school_type?: SchoolType;
  school_email?: string | null;
  school_contact_no?: string | null;
  school_website?: string | null;
  school_logo_url?: string | null;
  school_description?: string | null;
  address_line?: string | null;
  barangay?: string | null;
  city_municipality?: string;
  province?: string;
  postal_code?: string | null;
  country?: string;
}
