// src/modules/client/registration/types.tsx

export interface clientAccountDetails {
  user_fname: string;
  user_mname?: string;
  user_lname: string;
  suffix_name?: string;
  user_email: string;
  user_contact: string;
  password?: string;
  confirmPassword?: string;
}

export interface clientCompanyDetails {
  company_name: string;
  company_email?: string;
  company_contact?: string;
  industry: string;
  business_type?: string;
  company_size?: string;
  company_website?: string;
  company_description?: string;
}

export interface clientAddressDetails {
  company_province: string;
  company_city: string;
  company_brgy?: string;
  company_address?: string;
  company_zipCode?: string;
}

export interface clientRegistrationPayload {
  account: clientAccountDetails;
  company: clientCompanyDetails;
  address: clientAddressDetails;
  terms_accepted: boolean;
  privacy_accepted: boolean;
}

export interface RegistrationStepProps {
  formData: Partial<clientRegistrationPayload>;
  updateFields: (fields: Partial<clientRegistrationPayload>) => void;
  onNext: () => void;
  onBack?: () => void;
}

