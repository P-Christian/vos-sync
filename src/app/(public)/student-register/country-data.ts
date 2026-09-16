export type CountryData = {
  readonly name: string;
  readonly flag: string;
  readonly dialCode: string;
  readonly code: string;
  readonly example: string;
  readonly regex: RegExp;
};

export const COUNTRIES: readonly CountryData[] = [
  { name: "Philippines", flag: "PH", dialCode: "+63", code: "PH", example: "912 345 6789", regex: /^(?:\+63\s?9\d{9}|09\d{9}|9\d{9})$/ },
  { name: "United States", flag: "US", dialCode: "+1", code: "US", example: "(555) 000-0000", regex: /^(?:\+1\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/ },
  { name: "United Kingdom", flag: "GB", dialCode: "+44", code: "GB", example: "7911 123456", regex: /^(?:\+44\s?|0)?7\d{9}$/ },
  { name: "Australia", flag: "AU", dialCode: "+61", code: "AU", example: "412 345 678", regex: /^(?:\+61\s?|0)?4\d{8}$/ },
  { name: "Canada", flag: "CA", dialCode: "+1", code: "CA", example: "(555) 000-0000", regex: /^(?:\+1\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/ },
  { name: "Singapore", flag: "SG", dialCode: "+65", code: "SG", example: "9123 4567", regex: /^(?:\+65\s?)?[89]\d{7}$/ },
  { name: "Japan", flag: "JP", dialCode: "+81", code: "JP", example: "90 1234 5678", regex: /^(?:\+81\s?|0)?[789]0[-.\s]?\d{4}[-.\s]?\d{4}$/ },
  { name: "Germany", flag: "DE", dialCode: "+49", code: "DE", example: "151 12345678", regex: /^(?:\+49\s?|0)?1[567]\d{8,9}$/ },
  { name: "France", flag: "FR", dialCode: "+33", code: "FR", example: "6 12 34 56 78", regex: /^(?:\+33\s?|0)?[67]\d{8}$/ },
  { name: "India", flag: "IN", dialCode: "+91", code: "IN", example: "98765 43210", regex: /^(?:\+91\s?)?[6-9]\d{9}$/ },
  { name: "United Arab Emirates", flag: "AE", dialCode: "+971", code: "AE", example: "50 123 4567", regex: /^(?:\+971\s?|0)?5[024568]\d{7}$/ },
  { name: "Saudi Arabia", flag: "SA", dialCode: "+966", code: "SA", example: "50 123 4567", regex: /^(?:\+966\s?|0)?5\d{8}$/ },
  { name: "Qatar", flag: "QA", dialCode: "+974", code: "QA", example: "3312 3456", regex: /^(?:\+974\s?)?[3567]\d{7}$/ },
];

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const startsWithZero = digits.startsWith("0");
  const sliced = digits.slice(0, startsWithZero ? 11 : 10);
  if (startsWithZero) {
    if (sliced.length <= 4) return sliced;
    if (sliced.length <= 7) return `${sliced.slice(0, 4)}-${sliced.slice(4)}`;
    return `${sliced.slice(0, 4)}-${sliced.slice(4, 7)}-${sliced.slice(7)}`;
  }
  if (sliced.length <= 3) return sliced;
  if (sliced.length <= 6) return `${sliced.slice(0, 3)}-${sliced.slice(3)}`;
  return `${sliced.slice(0, 3)}-${sliced.slice(3, 6)}-${sliced.slice(6)}`;
}
