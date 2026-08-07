"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase, User, Eye, EyeOff, Check, ArrowLeft, ChevronDown, Search,
  Upload, X, FileText, Shield, Building2, GraduationCap
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { validatePasswordStrict } from '@/lib/password-validation';
import PasswordRequirementsChecklist from '@/components/auth/PasswordRequirementsChecklist';
import TurnstileWidget from '@/components/auth/TurnstileWidget';

// ─── Types & Country Data ─────────────────────────────────────────────────────

export interface CountryData {
  name: string;
  flag: string;
  dialCode: string;
  code: string;
  example: string;
  regex: RegExp;
}

export const COUNTRIES: CountryData[] = [
  { name: 'Philippines', flag: '🇵🇭', dialCode: '+63', code: 'PH', example: '912 345 6789', regex: /^(?:\+63\s?9\d{9}|09\d{9}|9\d{9})$/ },
  { name: 'United States', flag: '🇺🇸', dialCode: '+1', code: 'US', example: '(555) 000-0000', regex: /^(?:\+1\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/ },
  { name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', code: 'GB', example: '7911 123456', regex: /^(?:\+44\s?|0)?7\d{9}$/ },
  { name: 'Australia', flag: '🇦🇺', dialCode: '+61', code: 'AU', example: '412 345 678', regex: /^(?:\+61\s?|0)?4\d{8}$/ },
  { name: 'Canada', flag: '🇨🇦', dialCode: '+1', code: 'CA', example: '(555) 000-0000', regex: /^(?:\+1\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/ },
  { name: 'Singapore', flag: '🇸🇬', dialCode: '+65', code: 'SG', example: '9123 4567', regex: /^(?:\+65\s?)?[89]\d{7}$/ },
  { name: 'Japan', flag: '🇯🇵', dialCode: '+81', code: 'JP', example: '90 1234 5678', regex: /^(?:\+81\s?|0)?[789]0[-.\s]?\d{4}[-.\s]?\d{4}$/ },
  { name: 'Germany', flag: '🇩🇪', dialCode: '+49', code: 'DE', example: '151 12345678', regex: /^(?:\+49\s?|0)?1[567]\d{8,9}$/ },
  { name: 'France', flag: '🇫🇷', dialCode: '+33', code: 'FR', example: '6 12 34 56 78', regex: /^(?:\+33\s?|0)?[67]\d{8}$/ },
  { name: 'India', flag: '🇮🇳', dialCode: '+91', code: 'IN', example: '98765 43210', regex: /^(?:\+91\s?)?[6-9]\d{9}$/ },
  { name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971', code: 'AE', example: '50 123 4567', regex: /^(?:\+971\s?|0)?5[024568]\d{7}$/ },
  { name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', code: 'SA', example: '50 123 4567', regex: /^(?:\+966\s?|0)?5\d{8}$/ },
  { name: 'Qatar', flag: '🇶🇦', dialCode: '+974', code: 'QA', example: '3312 3456', regex: /^(?:\+974\s?)?[3567]\d{7}$/ },
  { name: 'Poland', flag: '🇵🇱', dialCode: '+48', code: 'PL', example: '512 345 678', regex: /^(?:\+48\s?)?[4-9]\d{8}$/ },
  { name: 'Portugal', flag: '🇵🇹', dialCode: '+351', code: 'PT', example: '912 345 678', regex: /^(?:\+351\s?)?9[1236]\d{7}$/ },
  { name: 'Puerto Rico', flag: '🇵🇷', dialCode: '+1', code: 'PR', example: '(787) 000-0000', regex: /^(?:\+1\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/ },
  { name: 'Paraguay', flag: '🇵🇾', dialCode: '+595', code: 'PY', example: '981 123456', regex: /^(?:\+595\s?|0)?9[6-9]\d{7}$/ },
  { name: 'Peru', flag: '🇵🇪', dialCode: '+51', code: 'PE', example: '912 345 678', regex: /^(?:\+51\s?)?9\d{8}$/ },
  { name: 'Papua New Guinea', flag: '🇵🇬', dialCode: '+675', code: 'PG', example: '7123 4567', regex: /^(?:\+675\s?)?7\d{7}$/ },
  { name: 'Réunion', flag: '🇷🇪', dialCode: '+262', code: 'RE', example: '692 12 34 56', regex: /^(?:\+262\s?|0)?69[23]\d{6}$/ },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const GOV_ID_TYPES = [
  'PhilSys National ID', 'Philippine Passport', "Driver's License (LTO)",
  'SSS ID', 'GSIS ID', 'PRC ID', "Voter's ID (COMELEC)", 'TIN ID (BIR)',
  'Postal ID', 'PhilHealth ID',
];

const CLIENT_STEPS = [
  { step: 1, label: 'Basic Info' },
  { step: 2, label: 'Upload ID' },
  { step: 3, label: 'Company' },
  { step: 4, label: 'Compliance' },
  { step: 5, label: 'Verify Email' },
];

const FREELANCER_STEPS = [
  { step: 1, label: 'Account Info' },
  { step: 2, label: 'Profile Details' },
  { step: 3, label: 'Verification' },
];


// ─── Location Option ──────────────────────────────────────────────────────────

// ─── Location Option ──────────────────────────────────────────────────────────

interface LocationOption { code: string; name: string; }

// ─── Phone Formatting Helper ──────────────────────────────────────────────────

export function formatPhoneNumber(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';

  const is434 = digits.startsWith('0');
  const maxDigits = is434 ? 11 : 10;
  const sliced = digits.slice(0, maxDigits);

  if (is434) {
    if (sliced.length <= 4) return sliced;
    if (sliced.length <= 7) return `${sliced.slice(0, 4)}-${sliced.slice(4)}`;
    return `${sliced.slice(0, 4)}-${sliced.slice(4, 7)}-${sliced.slice(7)}`;
  } else {
    if (sliced.length <= 3) return sliced;
    if (sliced.length <= 6) return `${sliced.slice(0, 3)}-${sliced.slice(3)}`;
    return `${sliced.slice(0, 3)}-${sliced.slice(3, 6)}-${sliced.slice(6)}`;
  }
}

// ─── PhoneCountryPicker ───────────────────────────────────────────────────────

function PhoneCountryPicker({
  selectedCountry, onSelectCountry, phoneValue, onPhoneChange, error, disabled,
}: {
  selectedCountry: CountryData;
  onSelectCountry: (c: CountryData) => void;
  phoneValue: string;
  onPhoneChange: (val: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dialCode.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={cn(
        'flex h-12 border-2 border-border rounded-lg overflow-hidden transition-colors focus-within:border-primary',
        error && 'border-destructive focus-within:border-destructive'
      )}>
        <button
          type="button" disabled={disabled} onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 bg-muted/40 hover:bg-muted border-r border-border transition-colors cursor-pointer shrink-0"
        >
          <span className="text-xl select-none leading-none">{selectedCountry.flag}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex items-center flex-1 px-3 bg-background">
          <span className="text-sm font-semibold text-muted-foreground mr-2 shrink-0 select-none">
            {selectedCountry.dialCode}
          </span>
          <input
            type="tel" disabled={disabled} value={phoneValue}
            onChange={e => onPhoneChange(formatPhoneNumber(e.target.value))} placeholder="Enter number"
            className="w-full h-full bg-transparent border-0 outline-none text-foreground text-sm font-medium placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-popover text-popover-foreground border-2 border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/20 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input type="text" autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search for country..."
              className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-border/20">
            {filtered.length === 0
              ? <div className="p-4 text-xs text-center text-muted-foreground">No country found</div>
              : filtered.map(c => (
                <button key={`${c.code}-${c.dialCode}`} type="button"
                  onClick={() => { onSelectCountry(c); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer hover:bg-muted/80',
                    selectedCountry.name === c.name && 'bg-primary/10 text-primary font-semibold'
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-base select-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px] ml-2 shrink-0">{c.dialCode}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep, steps = CLIENT_STEPS }: { currentStep: number; steps?: Array<{ step: number; label: string }> }) {
  return (
    <div className="flex items-start justify-center mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.step}>
          <div className="flex flex-col items-center gap-1.5 w-14">
            <div className={cn(
              'w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-200',
              currentStep > s.step
                ? 'bg-primary border-primary text-white'
                : currentStep === s.step
                  ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20'
                  : 'border-border text-muted-foreground/50'
            )}>
              {currentStep > s.step ? <Check size={14} /> : s.step}
            </div>
            <span className={cn(
              'text-[9px] font-medium text-center leading-tight',
              currentStep === s.step ? 'text-primary' : 'text-muted-foreground/50'
            )}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'h-0.5 flex-1 mt-[18px] transition-colors duration-200',
              currentStep > s.step ? 'bg-primary' : 'bg-border'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── SearchableLocationSelect ─────────────────────────────────────────────────

function SearchableLocationSelect({
  options, value, onChange, placeholder, disabled, loading: isLoading, error,
}: {
  options: LocationOption[];
  value: string;
  onChange: (code: string, name: string) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => o.code === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button" disabled={disabled || isLoading} onClick={() => setOpen(!open)}
        className={cn(
          'w-full h-12 flex items-center justify-between px-3 border-2 rounded-lg bg-background text-sm transition-colors',
          open ? 'border-primary' : 'border-border',
          error && 'border-destructive',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground/60'}>
          {isLoading ? 'Loading...' : (selected?.name ?? placeholder)}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-popover border-2 border-border rounded-xl shadow-xl z-40 overflow-hidden">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input type="text" autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="w-full bg-transparent text-xs outline-none" />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0
              ? <div className="p-3 text-xs text-center text-muted-foreground">No results</div>
              : filtered.map(o => (
                <button key={o.code} type="button"
                  onClick={() => { onChange(o.code, o.name); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted/80 transition-colors',
                    value === o.code && 'bg-primary/10 text-primary font-semibold'
                  )}
                >
                  {o.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main SignupPage ──────────────────────────────────────────────────────────

type MainStep = 'selection' | 'client' | 'client-otp' | 'freelancer' | 'freelancer-otp' | 'school' | 'school-otp';

function SignupPageContent() {
  const searchParams = useSearchParams();
  const queryType = searchParams.get('type');
  const inviteToken = searchParams.get('token');

  // ── Navigation ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<MainStep>('selection');
  const [clientStep, setClientStep] = useState(1);
  const [userType, setUserType] = useState<'client' | 'freelancer' | 'school' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  // ── Client Step 1: Basic Info ─────────────────────────────────────────────
  const [step1, setStep1] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', jobTitle: '', contact: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [contactCountry, setContactCountry] = useState<CountryData>(COUNTRIES[0]);

  // ── Client Step 2: Gov ID Upload ──────────────────────────────────────────
  const [govIdType, setGovIdType] = useState('');

  // Front ID
  const [govIdFrontFile, setGovIdFrontFile] = useState<File | null>(null);
  const [govIdFrontFileId, setGovIdFrontFileId] = useState<string | null>(null);
  const [govIdFrontPreview, setGovIdFrontPreview] = useState<string | null>(null);
  const [dragOverFront, setDragOverFront] = useState(false);
  const govIdFrontInputRef = useRef<HTMLInputElement>(null);

  // Back ID
  const [govIdBackFile, setGovIdBackFile] = useState<File | null>(null);
  const [govIdBackFileId, setGovIdBackFileId] = useState<string | null>(null);
  const [govIdBackPreview, setGovIdBackPreview] = useState<string | null>(null);
  const [dragOverBack, setDragOverBack] = useState(false);
  const govIdBackInputRef = useRef<HTMLInputElement>(null);

  // ── Client Step 3: Company Info ───────────────────────────────────────────
  const [company, setCompany] = useState({
    companyName: '', industry: '', websiteUrl: '', companySize: '',
    companyCountryCode: 'PH', companyCountryName: 'Philippines',
    companyProvinceCode: '', companyProvince: '',
    companyCityCode: '', companyCity: '',
    companyBarangay: '', companyStreet: '', landline: '', tin: '',
  });
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // ── Client Step 4: Compliance ─────────────────────────────────────────────
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  // ── Shared OTP ────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState('');
  const [otpUserId, setOtpUserId] = useState<number | null>(null);
  const [otpEmail, setOtpEmail] = useState('');

  // ── Freelancer (state preserved from existing impl) ───────────────────────
  const [freelancerStep, setFreelancerStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', jobTitle: '',
    password: '', confirmPassword: '', country: 'Philippines', contact: '',
    province: '', provinceCode: '', city: '', cityCode: '',
    barangay: '', street: '',
    skills: '', // primary skill/domain
  });
  const [freelancerSelectedCountry, setFreelancerSelectedCountry] = useState<CountryData>(COUNTRIES[0]);
  const [freelancerShowPassword, setFreelancerShowPassword] = useState(false);
  const [freelancerShowConfirmPassword, setFreelancerShowConfirmPassword] = useState(false);
  const [freelancerEmploymentTypes, setFreelancerEmploymentTypes] = useState<string[]>([]);
  const [freelancerTermsAgreed, setFreelancerTermsAgreed] = useState(false);
  const [freelancerMarketingConsent, setFreelancerMarketingConsent] = useState(true);
  const [freelancerErrors, setFreelancerErrors] = useState<Record<string, string>>({});
  const [freelancerUserId, setFreelancerUserId] = useState<number | null>(null);

  // Resume file state
  const [freelancerResumeFile, setFreelancerResumeFile] = useState<File | null>(null);
  const [freelancerResumeFileName, setFreelancerResumeFileName] = useState<string | null>(null);
  const [freelancerResumeFileId, setFreelancerResumeFileId] = useState<string | null>(null);

  // Gov ID state
  const [freelancerGovIdType, setFreelancerGovIdType] = useState('');
  const [freelancerGovIdFrontFile, setFreelancerGovIdFrontFile] = useState<File | null>(null);
  const [freelancerGovIdFrontFileId, setFreelancerGovIdFrontFileId] = useState<string | null>(null);
  const [freelancerGovIdFrontPreview, setFreelancerGovIdFrontPreview] = useState<string | null>(null);
  const [freelancerGovIdBackFile, setFreelancerGovIdBackFile] = useState<File | null>(null);
  const [freelancerGovIdBackFileId, setFreelancerGovIdBackFileId] = useState<string | null>(null);
  const [freelancerGovIdBackPreview, setFreelancerGovIdBackPreview] = useState<string | null>(null);

  // ── School Signup State ───────────────────────────────────────────────────
  const [schoolFormData, setSchoolFormData] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    email: '',
    password: '',
    confirmPassword: '',
    schoolName: '',
    schoolType: 'University' as 'University' | 'College' | 'Technical/Vocational' | 'Other',
    province: '',
    provinceCode: '',
    city: '',
    cityCode: '',
  });
  const [schoolSelectedCountry, setSchoolSelectedCountry] = useState<CountryData>(COUNTRIES[0]);
  const [schoolShowPassword, setSchoolShowPassword] = useState(false);
  const [schoolTermsAgreed, setSchoolTermsAgreed] = useState(false);
  const [schoolErrors, setSchoolErrors] = useState<Record<string, string>>({});
  const [schoolUserId, setSchoolUserId] = useState<number | null>(null);


  // ── Master Data Fetching (vs_company_size & vs_industry) ─────────────────
  const [fetchedCompanySizes, setFetchedCompanySizes] = useState<{ company_size_id: number; company_size_name: string }[]>([]);
  const [fetchedIndustries, setFetchedIndustries] = useState<{ industry_id: number; industry_name: string }[]>([]);

  useEffect(() => {
    async function loadMasterCollections() {
      try {
        const [sizeRes, indRes] = await Promise.all([
          fetch('/api/client/registration?directusCollection=vs_company_size&limit=-1'),
          fetch('/api/client/registration?directusCollection=vs_industry&limit=-1'),
        ]);

        if (sizeRes.ok) {
          const sizeJson = await sizeRes.json();
          const items = sizeJson.data;
          if (Array.isArray(items) && items.length > 0) {
            setFetchedCompanySizes(items);
          }
        }

        if (indRes.ok) {
          const indJson = await indRes.json();
          const items = indJson.data;
          if (Array.isArray(items) && items.length > 0) {
            setFetchedIndustries(items);
          }
        }
      } catch (err) {
        console.error("Failed to load dynamic master data for signup options:", err);
      }
    }
    loadMasterCollections();
  }, []);

  // ── PSGC API ──────────────────────────────────────────────────────────────

  const fetchProvinces = useCallback(async () => {
    setLoadingProvinces(true);
    setProvinces([]);
    setCities([]);
    setCompany(prev => ({ ...prev, companyProvinceCode: '', companyProvince: '', companyCityCode: '', companyCity: '' }));
    try {
      const res = await fetch('https://psgc.gitlab.io/api/provinces/', { cache: 'force-cache' });
      if (!res.ok) throw new Error('Failed to load provinces');
      const data = await res.json() as Array<{ code: string; name: string }>;
      setProvinces(data.sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ code: p.code, name: p.name })));
    } catch {
      toast.error('Could not load province list. Please try again.');
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  const fetchCities = useCallback(async (provinceCode: string) => {
    setLoadingCities(true);
    setCities([]);
    if (step === 'client') {
      setCompany(prev => ({ ...prev, companyCityCode: '', companyCity: '' }));
    }
    try {
      const res = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`, { cache: 'force-cache' });
      if (!res.ok) throw new Error('Failed to load cities');
      const data = await res.json() as Array<{ code: string; name: string }>;
      setCities(data.sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ code: c.code, name: c.name })));
    } catch {
      toast.error('Could not load city list. Please try again.');
    } finally {
      setLoadingCities(false);
    }
  }, [step]);

  useEffect(() => {
    const isClientStep3 = clientStep === 3 && company.companyCountryCode === 'PH';
    const isSchoolStep = step === 'school';
    const isFreelancerStep2 = step === 'freelancer' && freelancerStep === 2 && freelancerSelectedCountry.code === 'PH';
    if ((isClientStep3 || isSchoolStep || isFreelancerStep2) && provinces.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProvinces();
    }
  }, [clientStep, step, freelancerStep, company.companyCountryCode, freelancerSelectedCountry.code, provinces.length, fetchProvinces]);

  useEffect(() => {
    const provinceCode = company.companyProvinceCode || schoolFormData.provinceCode || formData.provinceCode;
    if (provinceCode && (company.companyCountryCode === 'PH' || step === 'school' || (step === 'freelancer' && freelancerSelectedCountry.code === 'PH'))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCities(provinceCode);
    }
  }, [company.companyProvinceCode, schoolFormData.provinceCode, formData.provinceCode, company.companyCountryCode, freelancerSelectedCountry.code, step, fetchCities]);


  // ── Selection Handlers ────────────────────────────────────────────────────

  const handleSelection = (type: 'client' | 'freelancer' | 'school') => setUserType(type);

  const handleProceedToForm = () => {
    if (!userType) return;
    if (userType === 'client') {
      setStep('client');
      setClientStep(1);
    } else if (userType === 'school') {
      setStep('school');
    } else {
      setStep('freelancer');
    }
    window.scrollTo(0, 0);
  };

  const handleBackToSelection = () => {
    setStep('selection');
    setUserType(null);
    setClientStep(1);
    setFreelancerStep(1);
    setErrors({});
    setFreelancerErrors({});
    setSchoolErrors({});
    
    // Reset Client Form
    setStep1({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '', jobTitle: '', contact: '' });
    setCompany({
      companyName: '', industry: '', websiteUrl: '', companySize: '',
      companyCountryCode: 'PH', companyCountryName: 'Philippines',
      companyProvinceCode: '', companyProvince: '', companyCityCode: '', companyCity: '',
      companyBarangay: '', companyStreet: '', landline: '', tin: ''
    });
    setGovIdType('');
    setGovIdFrontFile(null);
    setGovIdFrontFileId(null);
    setGovIdFrontPreview(null);
    setGovIdBackFile(null);
    setGovIdBackFileId(null);
    setGovIdBackPreview(null);
    setTermsAgreed(false);
    setMarketingConsent(false);
    setTurnstileToken('');

    // Reset Freelancer Form
    setFormData({
      firstName: '', lastName: '', email: '', jobTitle: '',
      password: '', confirmPassword: '', country: 'Philippines', contact: '',
      province: '', provinceCode: '', city: '', cityCode: '', barangay: '', street: '', skills: ''
    });
    setFreelancerEmploymentTypes([]);
    setFreelancerResumeFile(null);
    setFreelancerResumeFileName(null);
    setFreelancerResumeFileId(null);
    setFreelancerGovIdType('');
    setFreelancerGovIdFrontFile(null);
    setFreelancerGovIdFrontFileId(null);
    setFreelancerGovIdFrontPreview(null);
    setFreelancerGovIdBackFile(null);
    setFreelancerGovIdBackFileId(null);
    setFreelancerGovIdBackPreview(null);
    setFreelancerTermsAgreed(false);
    setFreelancerMarketingConsent(true);

    // Reset School Form
    setSchoolFormData({
      firstName: '', lastName: '', contact: '', email: '', password: '', confirmPassword: '',
      schoolName: '', schoolType: 'University', province: '', provinceCode: '', city: '', cityCode: ''
    });
    setSchoolTermsAgreed(false);
  };

  // Auto-detect invite type=school or token in URL params
  useEffect(() => {
    if (queryType === 'school' || inviteToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserType('school');
      setStep('school');
      if (inviteToken) {
        setLoading(true);
        fetch(`/api/auth/school-register?token=${inviteToken}`)
          .then(res => res.json())
          .then(data => {
            if (data.valid) {
              setSchoolFormData(prev => ({
                ...prev,
                schoolName: data.school_name || '',
                email: data.invited_email || '',
              }));
            } else {
              toast.error('Invitation link is invalid or expired.');
            }
          })
          .catch(() => toast.error('Error validating invitation link.'))
          .finally(() => setLoading(false));
      }
    }
  }, [queryType, inviteToken]);


  // ── Client Step 1 ─────────────────────────────────────────────────────────

  const s1Set = (field: string, value: string) => {
    setStep1(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!step1.firstName.trim()) e.firstName = 'First name is required';
    if (!step1.lastName.trim()) e.lastName = 'Last name is required';
    if (!step1.email.trim()) e.email = 'Work email is required';
    else if (!/\S+@\S+\.\S+/.test(step1.email)) e.email = 'Please enter a valid email address';
    if (!step1.jobTitle.trim()) e.jobTitle = 'Job title / role is required';
    if (!step1.contact.trim()) {
      e.contact = 'Mobile number is required';
    } else {
      const cleanDigits = step1.contact.replace(/\D/g, '');
      const full = `${contactCountry.dialCode} ${step1.contact.trim()}`;
      const fullClean = `${contactCountry.dialCode} ${cleanDigits}`;
      if (
        !contactCountry.regex.test(full) &&
        !contactCountry.regex.test(step1.contact.trim()) &&
        !contactCountry.regex.test(fullClean) &&
        !contactCountry.regex.test(cleanDigits)
      ) {
        e.contact = `Invalid format for ${contactCountry.name}. Example: ${contactCountry.dialCode} ${contactCountry.example}`;
      }
    }
    if (!step1.password) e.password = 'Password is required';
    else if (!validatePasswordStrict(step1.password)) e.password = 'Password does not meet security requirements';
    if (!step1.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (step1.confirmPassword !== step1.password) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1Next = () => {
    if (!validateStep1()) { toast.error('Please fix the errors before continuing.'); return; }
    setErrors({});
    setClientStep(2);
    window.scrollTo(0, 0);
  };

  // ── Client Step 2: Gov ID ─────────────────────────────────────────────────

  const validateAndSetGovIdFile = (file: File, side: 'front' | 'back') => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) { toast.error('Only .jpg, .png, or .pdf files are accepted.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must be under 5MB.'); return; }

    if (side === 'front') {
      setGovIdFrontFile(file);
      setGovIdFrontFileId(null);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => setGovIdFrontPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setGovIdFrontPreview(null);
      }
      setErrors(prev => ({ ...prev, govIdFrontFile: '' }));
    } else {
      setGovIdBackFile(file);
      setGovIdBackFileId(null);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => setGovIdBackPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setGovIdBackPreview(null);
      }
      setErrors(prev => ({ ...prev, govIdBackFile: '' }));
    }
  };

  const handleStep2Next = async () => {
    const e: Record<string, string> = {};
    if (!govIdType) e.govIdType = 'Please select a government ID type.';
    if (!govIdFrontFile) e.govIdFrontFile = 'Please upload the front side of your ID.';
    if (!govIdBackFile) e.govIdBackFile = 'Please upload the back side of your ID.';
    setErrors(e);
    if (Object.keys(e).length > 0) { toast.error('Please upload both front and back of your ID.'); return; }

    setLoading(true);
    try {
      let frontId = govIdFrontFileId;
      let backId = govIdBackFileId;

      if (!frontId && govIdFrontFile) {
        const fdFront = new FormData();
        fdFront.append('file', govIdFrontFile);
        fdFront.append('govIdType', `${govIdType} (Front)`);
        const resFront = await fetch('/api/auth/signup/upload-gov-id', { method: 'POST', body: fdFront });
        const dataFront = await resFront.json();
        if (!resFront.ok) { toast.error('Front ID upload failed', { description: dataFront.error || 'Could not upload front ID.' }); return; }
        frontId = dataFront.fileId;
        setGovIdFrontFileId(frontId);
      }

      if (!backId && govIdBackFile) {
        const fdBack = new FormData();
        fdBack.append('file', govIdBackFile);
        fdBack.append('govIdType', `${govIdType} (Back)`);
        const resBack = await fetch('/api/auth/signup/upload-gov-id', { method: 'POST', body: fdBack });
        const dataBack = await resBack.json();
        if (!resBack.ok) { toast.error('Back ID upload failed', { description: dataBack.error || 'Could not upload back ID.' }); return; }
        backId = dataBack.fileId;
        setGovIdBackFileId(backId);
      }

      toast.success('ID documents uploaded successfully!');
      setErrors({});
      setClientStep(3);
      window.scrollTo(0, 0);
    } catch {
      toast.error('Upload failed', { description: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Client Step 3: Company Info ───────────────────────────────────────────

  const cSet = (field: string, value: string) => {
    setCompany(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep3 = (): boolean => {
    const e: Record<string, string> = {};
    if (!company.industry) e.industry = 'Industry is required';
    if (!company.companyName.trim()) e.companyName = 'Company name is required';
    if (!company.companySize) e.companySize = 'Company size is required';
    if (!company.companyCountryName) e.companyCountry = 'Country is required';
    if (!company.companyProvince.trim()) e.companyProvince = 'Province / State is required';
    if (!company.companyCity.trim()) e.companyCity = 'City is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep3Next = () => {
    if (!validateStep3()) { toast.error('Please fill in all required company details.'); return; }
    setErrors({});
    setClientStep(4);
    window.scrollTo(0, 0);
  };

  // ── Client Step 4: Compliance + Final Submit ──────────────────────────────

  const handleStep4Submit = async () => {
    if (!termsAgreed) {
      setErrors({ terms: 'You must agree to the Terms of Service to continue.' });
      toast.error('Please agree to the Terms of Service.');
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const dialCode = contactCountry.dialCode;
      const rawContact = step1.contact.replace(/\D/g, '').replace(/^0/, '');
      const fullContact = `${dialCode}${rawContact}`;

      const payload = {
        account: {
          user_email: step1.email.trim().toLowerCase(),
          user_fname: step1.firstName.trim(),
          user_lname: step1.lastName.trim(),
          user_contact: fullContact,
          user_job_title: step1.jobTitle.trim(),
          password: step1.password,
          confirmPassword: step1.confirmPassword,
        },
        company: {
          company_name: company.companyName.trim(),
          industry: company.industry,
          company_size: company.companySize,
          company_website: company.websiteUrl.trim() || null,
          company_contact: company.landline.trim() || null,
          company_email: step1.email.trim().toLowerCase(),
        },
        address: {
          company_country: company.companyCountryName,
          company_province: company.companyProvince,
          company_city: company.companyCity,
          company_brgy: company.companyBarangay.trim() || null,
          company_address: company.companyStreet.trim() || null,
        },
        gov_id_front_file_id: govIdFrontFileId ?? null,
        gov_id_back_file_id: govIdBackFileId ?? null,
        gov_id_file_id: govIdFrontFileId ?? null,
        gov_id_type: govIdType || null,
        tin: company.tin.trim() || null,
        terms_accepted: true,
        privacy_accepted: true,
        marketing_consent: marketingConsent,
        turnstileToken,
      };

      const res = await fetch('/api/client/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Registration failed', { description: data.error || 'An error occurred.' });
        return;
      }

      toast.success('Account created!', {
        description: 'Please check your email for the verification code.',
      });

      setOtpUserId(data.userId ?? null);
      setOtpEmail(step1.email.trim().toLowerCase());
      setStep('client-otp');
      window.scrollTo(0, 0);
    } catch {
      toast.error('Registration failed', { description: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Client OTP ────────────────────────────────────────────────────────────

  const handleClientOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: otpUserId, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Verification failed', { description: data.message || 'Invalid code.' });
        return;
      }
      toast.success('Email verified!', { description: 'Welcome to VOS Sync.' });
      window.location.href = '/vos-sync/client/company-profile';
    } catch {
      toast.error('Verification failed', { description: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Freelancer Handlers ───────────────────────────────────────────────────

  const handleFreelancerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (freelancerErrors[id]) setFreelancerErrors(prev => ({ ...prev, [id]: '' }));
  };

  const handleFreelancerCountryChange = (val: string) => {
    setFormData(prev => ({ ...prev, country: val, provinceCode: '', province: '', cityCode: '', city: '' }));
    const match = COUNTRIES.find(c => c.name.toLowerCase() === val.toLowerCase());
    if (match) setFreelancerSelectedCountry(match);
    if (freelancerErrors.country) setFreelancerErrors(prev => ({ ...prev, country: '' }));
    if (freelancerErrors.contact) setFreelancerErrors(prev => ({ ...prev, contact: '' }));
  };

  const handleFreelancerCountryFromPicker = (c: CountryData) => {
    setFreelancerSelectedCountry(c);
    setFormData(prev => ({ ...prev, country: c.name }));
    if (freelancerErrors.contact) setFreelancerErrors(prev => ({ ...prev, contact: '' }));
  };

  const validateFreelancerStep1 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    if (!formData.email.trim()) e.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Please enter a valid email address';
    if (!formData.jobTitle.trim()) e.jobTitle = 'Job title / role is required';
    if (!formData.contact.trim()) {
      e.contact = 'Contact number is required';
    } else {
      const cleanDigits = formData.contact.replace(/\D/g, '');
      const full = `${freelancerSelectedCountry.dialCode} ${formData.contact.trim()}`;
      const fullClean = `${freelancerSelectedCountry.dialCode} ${cleanDigits}`;
      if (
        !freelancerSelectedCountry.regex.test(full) &&
        !freelancerSelectedCountry.regex.test(formData.contact.trim()) &&
        !freelancerSelectedCountry.regex.test(fullClean) &&
        !freelancerSelectedCountry.regex.test(cleanDigits)
      ) {
        e.contact = `Invalid number format for ${freelancerSelectedCountry.name}. Example: ${freelancerSelectedCountry.dialCode} ${freelancerSelectedCountry.example}`;
      }
    }
    if (!formData.password) e.password = 'Password is required';
    else if (!validatePasswordStrict(formData.password)) e.password = 'Password does not meet security requirements';
    if (formData.password !== formData.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setFreelancerErrors(e);
    return e;
  };

  const handleFreelancerStep1Next = () => {
    const errs = validateFreelancerStep1();
    if (Object.keys(errs).length === 0) {
      setFreelancerStep(2);
      window.scrollTo(0, 0);
    } else {
      const errorDetails = Object.values(errs).join(', ');
      toast.error('Validation Error', { description: errorDetails || 'Please check the form fields.' });
    }
  };

  const validateFreelancerStep2 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!formData.country) e.country = 'Country is required';
    if (freelancerSelectedCountry.code === 'PH') {
      if (!formData.provinceCode) e.province = 'Province is required';
      if (!formData.cityCode) e.city = 'City / Municipality is required';
    }
    if (freelancerEmploymentTypes.length === 0) {
      e.employmentTypes = 'Please select at least one employment type interest';
    }
    if (!formData.skills.trim()) {
      e.skills = 'Please enter at least one primary skill';
    }
    if (freelancerResumeFile) {
      const allowedExts = ['.pdf', '.docx'];
      const fileExt = freelancerResumeFile.name.substring(freelancerResumeFile.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        e.resume = 'Invalid resume format. Only .pdf and .docx are accepted.';
      }
      if (freelancerResumeFile.size > 10 * 1024 * 1024) {
        e.resume = 'Resume file size exceeds the 10MB limit.';
      }
    }
    setFreelancerErrors(e);
    return e;
  };

  const handleFreelancerStep2Next = async () => {
    const errs = validateFreelancerStep2();
    if (Object.keys(errs).length > 0) {
      const errorDetails = Object.values(errs).join(', ');
      toast.error('Validation Error', { description: errorDetails || 'Please check the form fields.' });
      return;
    }

    setLoading(true);
    try {
      if (freelancerResumeFile && !freelancerResumeFileId) {
        const fd = new FormData();
        fd.append('file', freelancerResumeFile);
        fd.append('govIdType', 'Resume/CV');
        fd.append('folder', 'c380f14b-75d1-4b61-b2b4-9a6e596f3162');
        const res = await fetch('/api/auth/signup/upload-gov-id', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) {
          toast.error('Resume upload failed', { description: data.error || 'Could not upload resume.' });
          setLoading(false);
          return;
        }
        setFreelancerResumeFileId(data.fileId);
      }
      setFreelancerStep(3);
      window.scrollTo(0, 0);
    } catch {
      toast.error('Upload failed', { description: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const validateFreelancerStep3 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!freelancerTermsAgreed) e.terms = 'You must agree to the Terms of Service to continue';
    if (freelancerGovIdType || freelancerGovIdFrontFile || freelancerGovIdBackFile) {
      if (!freelancerGovIdType) e.govIdType = 'Please select a government ID type';
      if (!freelancerGovIdFrontFile) e.govIdFront = 'Please upload the front side of your ID';
      if (!freelancerGovIdBackFile) e.govIdBack = 'Please upload the back side of your ID';
    }
    setFreelancerErrors(e);
    return e;
  };

  const handleFreelancerSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validateFreelancerStep3();
    if (Object.keys(errs).length > 0) {
      const errorDetails = Object.values(errs).join(', ');
      toast.error('Validation Error', { description: errorDetails || 'Please check the form fields.' });
      return;
    }
    setLoading(true);
    try {
      let frontId = freelancerGovIdFrontFileId;
      let backId = freelancerGovIdBackFileId;

      if (freelancerGovIdFrontFile && !frontId) {
        const fdFront = new FormData();
        fdFront.append('file', freelancerGovIdFrontFile);
        fdFront.append('govIdType', `${freelancerGovIdType} (Front)`);
        fdFront.append('folder', 'e81cc874-8036-4655-8bbb-1524a194866b');
        const resFront = await fetch('/api/auth/signup/upload-gov-id', { method: 'POST', body: fdFront });
        const dataFront = await resFront.json();
        if (!resFront.ok) {
          toast.error('Front ID upload failed', { description: dataFront.error || 'Could not upload front ID.' });
          setLoading(false);
          return;
        }
        frontId = dataFront.fileId;
        setFreelancerGovIdFrontFileId(frontId);
      }

      if (freelancerGovIdBackFile && !backId) {
        const fdBack = new FormData();
        fdBack.append('file', freelancerGovIdBackFile);
        fdBack.append('govIdType', `${freelancerGovIdType} (Back)`);
        fdBack.append('folder', 'e81cc874-8036-4655-8bbb-1524a194866b');
        const resBack = await fetch('/api/auth/signup/upload-gov-id', { method: 'POST', body: fdBack });
        const dataBack = await resBack.json();
        if (!resBack.ok) {
          toast.error('Back ID upload failed', { description: dataBack.error || 'Could not upload back ID.' });
          setLoading(false);
          return;
        }
        backId = dataBack.fileId;
        setFreelancerGovIdBackFileId(backId);
      }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'FREELANCER',
          turnstileToken,
          employmentTypes: freelancerEmploymentTypes,
          resumeFileId: freelancerResumeFileId,
          resumeFileName: freelancerResumeFileName,
          govIdType: freelancerGovIdType,
          govIdFrontFileId: frontId,
          govIdBackFileId: backId,
          marketingConsent: freelancerMarketingConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error('Signup failed', { description: data.message || 'An error occurred' }); return; }
      toast.success('Account created!', { description: 'Please check your email for the verification code.' });
      setFreelancerUserId(data.userId);
      setOtpEmail(formData.email);
      setStep('freelancer-otp');
    } catch {
      toast.error('Signup failed', { description: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFreelancerBack = () => {
    if (freelancerStep === 1) {
      handleBackToSelection();
    } else {
      setFreelancerStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleFreelancerOtpSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: freelancerUserId, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error('Verification failed', { description: data.message || 'Invalid code.' }); return; }
      toast.success('Verified!', { description: 'Welcome to VOS Sync.' });
      if (data?.role_id === 1) {
        window.location.href = '/vos-sync/freelancer/dashboard';
      } else {
        window.location.href = '/main-dashboard';
      }
    } catch {
      toast.error('Verification failed', { description: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render: Selection ────────────────────────────────────────────────────

  const renderSelectionScreen = () => (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
      <h1 className="text-3xl md:text-4xl font-medium text-primary mb-3">
        Join VOS Sync
      </h1>
      <p className="text-base text-muted-foreground mb-4">
        Choose how you&apos;ll use the platform.
      </p>
      <div className="flex justify-center mb-10">
        <span className="text-muted-foreground mr-2">Already have an account?</span>
        <Link href="/login" className="text-primary font-medium hover:underline">Log In</Link>
      </div>

      <div className="flex flex-col gap-4 max-w-xl mx-auto mb-10">
        {([
          { type: 'client', label: 'Employer / Client', desc: 'Recruit employees and professionals for your organization.', icon: <Briefcase size={28} /> },
          { type: 'freelancer', label: 'Job Seeker', desc: 'Explore job opportunities and apply with confidence.', icon: <User size={28} /> },
          { type: 'school', label: 'School / Institution', desc: 'Register your educational institution and courses.', icon: <GraduationCap size={28} /> }
        ] as const).map(item => (
          <button key={item.type} onClick={() => handleSelection(item.type)}
            className="group relative flex items-center justify-between p-6 border-2 border-border rounded-xl text-left transition-all duration-200 hover:border-primary hover:shadow-md hover:bg-muted/50"
          >
            <div className="flex items-center gap-5">
              <div className="p-3 bg-muted text-foreground rounded-lg group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-4 ${userType === item.type ? 'border-primary bg-primary' : 'border-border'}`}>
              {userType === item.type && <Check size={16} className="text-white" />}
            </div>
          </button>
        ))}
      </div>

      <div className="max-w-md mx-auto">
        <Button onClick={handleProceedToForm} disabled={!userType}
          className={`w-full py-6 rounded-full font-medium text-white transition-colors text-lg ${userType ? 'bg-primary hover:bg-primary/90' : 'bg-muted-foreground/30 cursor-not-allowed hover:bg-muted-foreground/30'}`}
        >
          {userType === 'client' ? 'Create Employer Account' : userType === 'freelancer' ? 'Create Job Seeker Account' : userType === 'school' ? 'Create School Account' : 'Create Account'}
        </Button>
      </div>
    </div>
  );

  // ─── Render: Client Step 1 ────────────────────────────────────────────────


  const renderClientStep1 = () => (
    <div className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <button onClick={handleBackToSelection} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} className="mr-2" />Back to selection
        </button>
      </div>
      <StepIndicator currentStep={1} />
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-medium text-primary">Create your Client account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Set up your account credentials and representative details.</p>
      </div>

      <div className="space-y-5">
        {/* Account Credentials */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Account Credentials</p>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Work Email Address <span className="text-destructive">*</span>
              </label>
              <Input id="c-email" type="email" value={step1.email}
                onChange={e => s1Set('email', e.target.value)} disabled={loading}
                placeholder="e.g. hr@company.com"
                className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.email && 'border-destructive')} />
              {errors.email && <p className="text-xs text-destructive mt-1 font-medium">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    Password <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input id="c-password" type={showPassword ? 'text' : 'password'} value={step1.password}
                      onChange={e => s1Set('password', e.target.value)} disabled={loading} placeholder="8+ characters"
                      className={cn('h-12 pr-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.password && 'border-destructive')} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1 font-medium">{errors.password}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    Confirm Password <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input id="c-confirm" type={showConfirmPassword ? 'text' : 'password'} value={step1.confirmPassword}
                      onChange={e => s1Set('confirmPassword', e.target.value)} disabled={loading} placeholder="Repeat password"
                      className={cn('h-12 pr-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.confirmPassword && 'border-destructive')} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive mt-1 font-medium">{errors.confirmPassword}</p>}
                </div>
              </div>
              <PasswordRequirementsChecklist password={step1.password} confirmPassword={step1.confirmPassword} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Representative Information */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Representative Information</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input id="c-firstName" value={step1.firstName} onChange={e => s1Set('firstName', e.target.value)}
                  disabled={loading} placeholder="e.g. Jane"
                  className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.firstName && 'border-destructive')} />
                {errors.firstName && <p className="text-xs text-destructive mt-1 font-medium">{errors.firstName}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <Input id="c-lastName" value={step1.lastName} onChange={e => s1Set('lastName', e.target.value)}
                  disabled={loading} placeholder="e.g. Dela Cruz"
                  className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.lastName && 'border-destructive')} />
                {errors.lastName && <p className="text-xs text-destructive mt-1 font-medium">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Job Title / Role <span className="text-destructive">*</span>
              </label>
              <Input id="c-jobTitle" value={step1.jobTitle} onChange={e => s1Set('jobTitle', e.target.value)}
                disabled={loading} placeholder="e.g. HR Manager, Recruiter, Managing Director, Founder"
                className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.jobTitle && 'border-destructive')} />
              {errors.jobTitle && <p className="text-xs text-destructive mt-1 font-medium">{errors.jobTitle}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Direct Mobile Number <span className="text-destructive">*</span>
              </label>
              <PhoneCountryPicker
                selectedCountry={contactCountry}
                onSelectCountry={c => { setContactCountry(c); if (errors.contact) setErrors(prev => ({ ...prev, contact: '' })); }}
                phoneValue={step1.contact}
                onPhoneChange={val => s1Set('contact', val)}
                error={errors.contact} disabled={loading}
              />
              {errors.contact && <p className="text-xs text-destructive mt-1 font-medium">{errors.contact}</p>}
            </div>
          </div>
        </div>

        <Button type="button" onClick={handleStep1Next} disabled={loading || !validatePasswordStrict(step1.password)}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-base disabled:opacity-50">
          Continue to ID Upload →
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );

  // ─── Render: Client Step 2 — Gov ID Upload ────────────────────────────────

  const renderClientStep2 = () => (
    <div className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <button onClick={() => { setClientStep(1); setErrors({}); }} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} className="mr-2" />Back
        </button>
      </div>
      <StepIndicator currentStep={2} />
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-medium text-primary">Upload Government ID</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upload clear photos or PDFs of the front and back of your government-issued ID.</p>
      </div>

      <div className="space-y-5">
        {/* ID Type */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">
            ID Type <span className="text-destructive">*</span>
          </label>
          <Select value={govIdType} onValueChange={val => { setGovIdType(val); if (errors.govIdType) setErrors(prev => ({ ...prev, govIdType: '' })); }} disabled={loading}>
            <SelectTrigger className={cn('h-12 border-2 border-border focus:ring-0 focus:border-primary text-sm', errors.govIdType && 'border-destructive')}>
              <SelectValue placeholder="Select ID type..." />
            </SelectTrigger>
            <SelectContent>
              {GOV_ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.govIdType && <p className="text-xs text-destructive mt-1 font-medium">{errors.govIdType}</p>}
        </div>

        {/* Front ID Dropzone */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">
            Front Side of ID <span className="text-destructive">*</span>
          </label>

          {!govIdFrontFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOverFront(true); }}
              onDragLeave={() => setDragOverFront(false)}
              onDrop={e => { e.preventDefault(); setDragOverFront(false); const f = e.dataTransfer.files[0]; if (f) validateAndSetGovIdFile(f, 'front'); }}
              onClick={() => govIdFrontInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
                dragOverFront ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                errors.govIdFrontFile && 'border-destructive'
              )}
            >
              <Upload className="mx-auto mb-2 text-muted-foreground/60" size={28} />
              <p className="text-sm font-medium text-foreground mb-0.5">
                Drop <span className="font-semibold text-primary">Front Side</span> here, or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">Accepted: .jpg, .png, .pdf — Max 5MB</p>
            </div>
          ) : (
            <div className="border-2 border-border rounded-xl p-3 flex items-center gap-3">
              {govIdFrontPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={govIdFrontPreview} alt="Front ID Preview" className="w-16 h-12 object-cover rounded-lg border border-border shrink-0" />
              ) : (
                <div className="w-16 h-12 bg-muted/50 rounded-lg border border-border flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Front Side</p>
                <p className="text-sm font-medium text-foreground truncate">{govIdFrontFile.name}</p>
                <p className="text-[11px] text-muted-foreground">{(govIdFrontFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button"
                onClick={() => { setGovIdFrontFile(null); setGovIdFrontFileId(null); setGovIdFrontPreview(null); }}
                className="text-muted-foreground hover:text-destructive transition-colors p-1">
                <X size={18} />
              </button>
            </div>
          )}
          <input ref={govIdFrontInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) validateAndSetGovIdFile(f, 'front'); e.target.value = ''; }} />
          {errors.govIdFrontFile && <p className="text-xs text-destructive mt-1 font-medium">{errors.govIdFrontFile}</p>}
        </div>

        {/* Back ID Dropzone */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">
            Back Side of ID <span className="text-destructive">*</span>
          </label>

          {!govIdBackFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOverBack(true); }}
              onDragLeave={() => setDragOverBack(false)}
              onDrop={e => { e.preventDefault(); setDragOverBack(false); const f = e.dataTransfer.files[0]; if (f) validateAndSetGovIdFile(f, 'back'); }}
              onClick={() => govIdBackInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
                dragOverBack ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                errors.govIdBackFile && 'border-destructive'
              )}
            >
              <Upload className="mx-auto mb-2 text-muted-foreground/60" size={28} />
              <p className="text-sm font-medium text-foreground mb-0.5">
                Drop <span className="font-semibold text-primary">Back Side</span> here, or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">Accepted: .jpg, .png, .pdf — Max 5MB</p>
            </div>
          ) : (
            <div className="border-2 border-border rounded-xl p-3 flex items-center gap-3">
              {govIdBackPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={govIdBackPreview} alt="Back ID Preview" className="w-16 h-12 object-cover rounded-lg border border-border shrink-0" />
              ) : (
                <div className="w-16 h-12 bg-muted/50 rounded-lg border border-border flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Back Side</p>
                <p className="text-sm font-medium text-foreground truncate">{govIdBackFile.name}</p>
                <p className="text-[11px] text-muted-foreground">{(govIdBackFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button"
                onClick={() => { setGovIdBackFile(null); setGovIdBackFileId(null); setGovIdBackPreview(null); }}
                className="text-muted-foreground hover:text-destructive transition-colors p-1">
                <X size={18} />
              </button>
            </div>
          )}
          <input ref={govIdBackInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) validateAndSetGovIdFile(f, 'back'); e.target.value = ''; }} />
          {errors.govIdBackFile && <p className="text-xs text-destructive mt-1 font-medium">{errors.govIdBackFile}</p>}
        </div>

        {/* Info Box */}
        <div className="rounded-xl bg-muted/30 border border-border p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground text-sm mb-2">📋 Upload Requirements</p>
          <p>• Both <strong>Front and Back</strong> of the ID are required</p>
          <p>• Accepted formats: <strong>.jpg, .png, .pdf</strong></p>
          <p>• Maximum file size: <strong>5 MB per file</strong></p>
          <p>• Ensure the ID is <strong>clear, unobstructed, and not expired</strong></p>
        </div>

        <Button type="button" onClick={handleStep2Next} disabled={loading || !govIdFrontFile || !govIdBackFile}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-base disabled:opacity-50">
          {loading ? 'Uploading...' : 'Continue to Company Info →'}
        </Button>
      </div>
    </div>
  );

  // ─── Render: Client Step 3 — Company Info ────────────────────────────────

  const renderClientStep3 = () => {
    const isPhilippines = company.companyCountryCode === 'PH';
    return (
      <div className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <button onClick={() => { setClientStep(2); setErrors({}); }} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={16} className="mr-2" />Back
          </button>
        </div>
        <StepIndicator currentStep={3} />
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-medium text-primary">Company Information</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tell us about your company or organization.</p>
        </div>

        <div className="space-y-5">


          {/* Company Name */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Company / Organization Name <span className="text-destructive">*</span>
            </label>
            <Input value={company.companyName} onChange={e => cSet('companyName', e.target.value)}
              disabled={loading} placeholder="e.g. Acme Corporation"
              className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.companyName && 'border-destructive')} />
            {errors.companyName && <p className="text-xs text-destructive mt-1 font-medium">{errors.companyName}</p>}
          </div>

          {/* Industry / Sector + Company Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Industry / Sector <span className="text-destructive">*</span>
              </label>
              <SearchableLocationSelect
                options={fetchedIndustries.map(i => ({ code: i.industry_name, name: i.industry_name }))}
                value={company.industry}
                onChange={(_code, name) => cSet('industry', name)}
                placeholder="Select industry..."
                error={errors.industry}
                disabled={loading}
              />
              {errors.industry && <p className="text-xs text-destructive mt-1 font-medium">{errors.industry}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Company Size <span className="text-destructive">*</span>
              </label>
              <Select value={company.companySize} onValueChange={val => cSet('companySize', val)} disabled={loading}>
                <SelectTrigger className={cn('!h-12 w-full border-2 border-border focus:ring-0 focus:border-primary text-sm', errors.companySize && 'border-destructive')}>
                  <SelectValue placeholder="Select size..." />
                </SelectTrigger>
                <SelectContent>
                  {fetchedCompanySizes.map(s => (
                    <SelectItem key={s.company_size_id} value={s.company_size_name}>{s.company_size_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companySize && <p className="text-xs text-destructive mt-1 font-medium">{errors.companySize}</p>}
            </div>
          </div>

          {/* Company Website */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Company Website / Social URL</label>
            <Input value={company.websiteUrl} onChange={e => cSet('websiteUrl', e.target.value)}
              disabled={loading} placeholder="https://..."
              className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
          </div>

          {/* Location */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Company Location</p>
            <div className="space-y-4">
              {/* Country */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Country <span className="text-destructive">*</span>
                </label>
                <SearchableLocationSelect
                  options={COUNTRIES.map(c => ({ code: c.code, name: `${c.flag} ${c.name}` }))}
                  value={company.companyCountryCode}
                  onChange={(code) => {
                    const found = COUNTRIES.find(c => c.code === code);
                    if (!found) return;
                    setCompany(prev => ({
                      ...prev,
                      companyCountryCode: found.code,
                      companyCountryName: found.name,
                      companyProvinceCode: '', companyProvince: '',
                      companyCityCode: '', companyCity: '',
                    }));
                    setProvinces([]); setCities([]);
                    if (found.code === 'PH') fetchProvinces();
                    if (errors.companyCountry) setErrors(prev => ({ ...prev, companyCountry: '' }));
                  }}
                  placeholder="Select country..."
                  error={errors.companyCountry}
                />
                {errors.companyCountry && <p className="text-xs text-destructive mt-1 font-medium">{errors.companyCountry}</p>}
              </div>

              {/* Province / State */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  {isPhilippines ? 'Province' : 'State / Province'} <span className="text-destructive">*</span>
                </label>
                {isPhilippines ? (
                  <SearchableLocationSelect options={provinces} value={company.companyProvinceCode}
                    onChange={(code, name) => { setCompany(prev => ({ ...prev, companyProvinceCode: code, companyProvince: name, companyCityCode: '', companyCity: '' })); if (errors.companyProvince) setErrors(prev => ({ ...prev, companyProvince: '' })); }}
                    placeholder="Select province..." loading={loadingProvinces} error={errors.companyProvince} />
                ) : (
                  <Input value={company.companyProvince} onChange={e => cSet('companyProvince', e.target.value)}
                    disabled={loading} placeholder="Enter state / province"
                    className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.companyProvince && 'border-destructive')} />
                )}
                {errors.companyProvince && <p className="text-xs text-destructive mt-1 font-medium">{errors.companyProvince}</p>}
              </div>

              {/* City */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  {isPhilippines ? 'City / Municipality' : 'City'} <span className="text-destructive">*</span>
                </label>
                {isPhilippines ? (
                  <SearchableLocationSelect options={cities} value={company.companyCityCode}
                    onChange={(code, name) => { setCompany(prev => ({ ...prev, companyCityCode: code, companyCity: name })); if (errors.companyCity) setErrors(prev => ({ ...prev, companyCity: '' })); }}
                    placeholder={company.companyProvinceCode ? 'Select city...' : 'Select province first...'}
                    loading={loadingCities} disabled={!company.companyProvinceCode} error={errors.companyCity} />
                ) : (
                  <Input value={company.companyCity} onChange={e => cSet('companyCity', e.target.value)}
                    disabled={loading} placeholder="Enter city"
                    className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', errors.companyCity && 'border-destructive')} />
                )}
                {errors.companyCity && <p className="text-xs text-destructive mt-1 font-medium">{errors.companyCity}</p>}
              </div>

              {/* Barangay + Street */}
              <div className={cn('grid gap-4', isPhilippines ? 'grid-cols-2' : 'grid-cols-1')}>
                {isPhilippines && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-foreground">Barangay</label>
                    <Input value={company.companyBarangay} onChange={e => setCompany(prev => ({ ...prev, companyBarangay: e.target.value }))}
                      disabled={loading} placeholder="e.g. Brgy. Longos"
                      className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">Street Address</label>
                  <Input value={company.companyStreet} onChange={e => setCompany(prev => ({ ...prev, companyStreet: e.target.value }))}
                    disabled={loading} placeholder="e.g. 123 Rizal Ave."
                    className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Optional: Landline + TIN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Company Landline / Official Support</label>
              <Input value={company.landline} onChange={e => setCompany(prev => ({ ...prev, landline: e.target.value }))}
                disabled={loading} placeholder="e.g. (02) 8123-4567"
                className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">TIN / Business Reg. No.</label>
              <Input value={company.tin} onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                const parts: string[] = [];
                for (let i = 0; i < digits.length; i += 3) {
                  parts.push(digits.slice(i, i + 3));
                }
                const formatted = parts.join('-');
                setCompany(prev => ({ ...prev, tin: formatted }));
              }}
                disabled={loading} placeholder="e.g. 123-456-789-000"
                className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary font-mono" />
            </div>
          </div>

          <Button type="button" onClick={handleStep3Next} disabled={loading}
            className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-base">
            Continue to Compliance →
          </Button>
        </div>
      </div>
    );
  };

  // ─── Render: Client Step 4 — Compliance ──────────────────────────────────

  const renderClientStep4 = () => (
    <div className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <button onClick={() => { setClientStep(3); setErrors({}); }} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} className="mr-2" />Back
        </button>
      </div>
      <StepIndicator currentStep={4} />
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-medium text-primary">Compliance & Security</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review and agree to our terms before creating your account.</p>
      </div>

      <div className="space-y-6">
        {/* Verification Notice */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-primary" />
            <span className="text-sm font-semibold text-primary">Account Verification Notice</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your account will be set to <strong>Pending Verification</strong> after submission. You can log in but will have restricted access until our team approves your account. Verification typically takes 1–3 business days.
          </p>
        </div>

        {/* Restrictions reminder */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Pending account restrictions</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 ml-1">
            <li>• Cannot post jobs until verified</li>
            <li>• Cannot browse candidate profiles</li>
            <li>• Cannot send candidate messages</li>
          </ul>
        </div>

        {/* Marketing Consent */}
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox id="marketing-consent" checked={marketingConsent} onCheckedChange={val => setMarketingConsent(Boolean(val))}
            className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary text-white" />
          <span className="text-sm text-muted-foreground leading-snug select-none">
            Send me emails with tips on how to find talent that fits my needs. <span className="text-muted-foreground/60">(Optional)</span>
          </span>
        </label>

        {/* Terms Agreement */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox id="terms-checkbox" checked={termsAgreed}
              onCheckedChange={val => { setTermsAgreed(Boolean(val)); if (errors.terms) setErrors(prev => ({ ...prev, terms: '' })); }}
              className={cn('mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary text-white', errors.terms && 'border-destructive')} />
            <span className={cn('text-sm leading-snug select-none', errors.terms ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              Yes, I understand and agree to the{' '}
              <Link href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">VOS Sync Terms of Service</Link>, including the{' '}
              <Link href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">User Agreement</Link> and{' '}
              <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Privacy Policy</Link>.
              <span className="text-destructive ml-0.5">*</span>
            </span>
          </label>
          {errors.terms && <p className="text-xs text-destructive mt-1.5 font-medium pl-7">{errors.terms}</p>}
        </div>

        {/* CAPTCHA / Bot Protection */}
        
          <TurnstileWidget
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken('')}
          />
   

        {/* Submit */}
        <Button type="button" onClick={handleStep4Submit} disabled={loading || !termsAgreed}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-semibold transition-all text-base disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? 'Creating your account...' : 'Create Employer Account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );

  // ─── Render: Client OTP ───────────────────────────────────────────────────

  const renderClientOtpScreen = () => (
    <div className="w-full max-w-sm mx-auto px-4 sm:px-6 py-12 text-center">
      <StepIndicator currentStep={5} />
      <div className="mb-8">
        <h1 className="text-3xl font-medium text-primary mb-4">Verify your email</h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent a 6-digit verification code to{' '}
          <strong>{otpEmail}</strong>. Please enter it below.
        </p>
      </div>
      <form onSubmit={handleClientOtpSubmit} className="space-y-6">
        <Input id="client-otp" type="text" maxLength={6} value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} disabled={loading} placeholder="000000"
          className="h-16 text-center text-3xl tracking-[1em] font-mono border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
        <Button type="submit" disabled={loading || otp.length !== 6}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg">
          {loading ? 'Verifying...' : 'Verify Email'}
        </Button>
      </form>
    </div>
  );

  // ─── Render: Freelancer Form ──────────────────────────────────────────────

  const renderFreelancerStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
            First name <span className="text-destructive">*</span>
          </label>
          <Input id="firstName" value={formData.firstName} onChange={handleFreelancerChange} disabled={loading} placeholder="e.g. Jane"
            className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', freelancerErrors.firstName && 'border-destructive focus-visible:border-destructive text-destructive')} />
          {freelancerErrors.firstName && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.firstName}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
            Last name <span className="text-destructive">*</span>
          </label>
          <Input id="lastName" value={formData.lastName} onChange={handleFreelancerChange} disabled={loading} placeholder="e.g. Doe"
            className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', freelancerErrors.lastName && 'border-destructive focus-visible:border-destructive text-destructive')} />
          {freelancerErrors.lastName && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email Address <span className="text-destructive">*</span>
        </label>
        <Input type="email" id="email" value={formData.email} onChange={handleFreelancerChange} disabled={loading} placeholder="e.g. jane.doe@example.com"
          className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', freelancerErrors.email && 'border-destructive focus-visible:border-destructive text-destructive')} />
        {freelancerErrors.email && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.email}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="jobTitle" className="block text-sm font-medium text-foreground">
          Job Title / Role <span className="text-destructive">*</span>
        </label>
        <Input id="jobTitle" value={formData.jobTitle} onChange={handleFreelancerChange} disabled={loading}
          placeholder="e.g. HR Manager, Recruiter, Managing Director, Founder"
          className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', freelancerErrors.jobTitle && 'border-destructive focus-visible:border-destructive text-destructive')} />
        {freelancerErrors.jobTitle && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.jobTitle}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">
          Contact Number <span className="text-destructive">*</span>
        </label>
        <PhoneCountryPicker selectedCountry={freelancerSelectedCountry}
          onSelectCountry={handleFreelancerCountryFromPicker}
          phoneValue={formData.contact}
          onPhoneChange={val => { setFormData(prev => ({ ...prev, contact: val })); if (freelancerErrors.contact) setFreelancerErrors(prev => ({ ...prev, contact: '' })); }}
          error={freelancerErrors.contact} disabled={loading} />
        {freelancerErrors.contact && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.contact}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input type={freelancerShowPassword ? 'text' : 'password'} id="password" value={formData.password}
                onChange={handleFreelancerChange} disabled={loading} placeholder="Password (8 or more characters)"
                className={cn('h-12 pr-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', freelancerErrors.password && 'border-destructive focus-visible:border-destructive text-destructive')} />
              <button type="button" onClick={() => setFreelancerShowPassword(!freelancerShowPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                {freelancerShowPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {freelancerErrors.password && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.password}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input type={freelancerShowConfirmPassword ? 'text' : 'password'} id="confirmPassword" value={formData.confirmPassword}
                onChange={handleFreelancerChange} disabled={loading} placeholder="Confirm Password"
                className={cn('h-12 pr-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', freelancerErrors.confirmPassword && 'border-destructive focus-visible:border-destructive text-destructive')} />
              <button type="button" onClick={() => setFreelancerShowConfirmPassword(!freelancerShowConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                {freelancerShowConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {freelancerErrors.confirmPassword && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.confirmPassword}</p>}
          </div>
        </div>
        <PasswordRequirementsChecklist password={formData.password} className="mt-1" />
      </div>

      <Button type="button" onClick={handleFreelancerStep1Next}
        disabled={loading || !formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.jobTitle.trim() || !formData.contact.trim() || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword || !validatePasswordStrict(formData.password)}
        className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed">
        Continue
      </Button>
    </div>
  );

  const renderFreelancerStep2 = () => (
    <div className="space-y-6">
      {/* Location */}
      <div className="space-y-4 border-b border-border/60 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location Details</p>

        <div className="space-y-1">
          <label htmlFor="country" className="block text-sm font-medium text-foreground">
            Country <span className="text-destructive">*</span>
          </label>
          <Select value={formData.country} onValueChange={handleFreelancerCountryChange} disabled={loading}>
            <SelectTrigger id="country" className={cn('h-12 border-2 border-border focus:ring-0 focus:border-primary text-base', freelancerErrors.country && 'border-destructive focus:border-destructive text-destructive')}>
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.flag} {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {freelancerErrors.country && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.country}</p>}
        </div>

        {freelancerSelectedCountry.code === 'PH' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Province <span className="text-destructive">*</span>
              </label>
              <SearchableLocationSelect options={provinces} value={formData.provinceCode}
                onChange={(code, name) => setFormData(prev => ({ ...prev, provinceCode: code, province: name, cityCode: '', city: '' }))}
                placeholder="Search province..." disabled={loading || loadingProvinces} error={freelancerErrors.province} />
              {freelancerErrors.province && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.province}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                City / Municipality <span className="text-destructive">*</span>
              </label>
              <SearchableLocationSelect options={cities} value={formData.cityCode}
                onChange={(code, name) => setFormData(prev => ({ ...prev, cityCode: code, city: name }))}
                placeholder="Search city..." disabled={!formData.provinceCode || loading || loadingCities} error={freelancerErrors.city} />
              {freelancerErrors.city && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.city}</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="barangay" className="block text-sm font-medium text-foreground">
              Barangay (Optional)
            </label>
            <Input id="barangay" value={formData.barangay} onChange={handleFreelancerChange} disabled={loading} placeholder="e.g. Brgy. 76"
              className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
          </div>
          <div className="space-y-1">
            <label htmlFor="street" className="block text-sm font-medium text-foreground">
              Street Address (Optional)
            </label>
            <Input id="street" value={formData.street} onChange={handleFreelancerChange} disabled={loading} placeholder="e.g. 123 Maple Street"
              className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
          </div>
        </div>
      </div>

      {/* Work Preferences */}
      <div className="space-y-4 border-b border-border/60 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work Intent & Availability</p>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Employment Type Interest <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-4 mt-2">
            {['On-site', 'Hybrid', 'Remote'].map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <Checkbox checked={freelancerEmploymentTypes.includes(type)}
                  onCheckedChange={checked => {
                    if (checked) {
                      setFreelancerEmploymentTypes(prev => [...prev, type]);
                    } else {
                      setFreelancerEmploymentTypes(prev => prev.filter(t => t !== type));
                    }
                  }} />
                <span>{type}</span>
              </label>
            ))}
          </div>
          {freelancerErrors.employmentTypes && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.employmentTypes}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="skills" className="block text-sm font-medium text-foreground">
            Primary Skills / Domain <span className="text-destructive">*</span>
          </label>
          <Input id="skills" value={formData.skills} onChange={handleFreelancerChange} disabled={loading}
            placeholder="e.g. React, Node.js, UI/UX Design (comma separated)"
            className={cn('h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary', freelancerErrors.skills && 'border-destructive')} />
          {freelancerErrors.skills && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.skills}</p>}
        </div>

        {/* Resume CV upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Upload Resume / CV (Optional)
          </label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/10 transition-colors cursor-pointer relative">
            <input type="file" accept=".pdf,.docx" disabled={loading}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setFreelancerResumeFile(file);
                  setFreelancerResumeFileName(file.name);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer" />
            <div className="flex flex-col items-center justify-center gap-2">
              <Upload size={32} className="text-muted-foreground" />
              <p className="text-sm font-semibold">{freelancerResumeFileName || 'Click or drag file here to upload'}</p>
              <p className="text-xs text-muted-foreground">Accepted formats: .pdf, .docx (Max size: 10MB)</p>
            </div>
          </div>
          {freelancerResumeFileName && (
            <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg text-sm border border-border/80">
              <span className="font-medium truncate max-w-[80%]">{freelancerResumeFileName}</span>
              <button type="button" onClick={() => { setFreelancerResumeFile(null); setFreelancerResumeFileName(null); setFreelancerResumeFileId(null); }}
                className="text-destructive hover:underline font-semibold cursor-pointer">Remove</button>
            </div>
          )}
          {freelancerErrors.resume && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.resume}</p>}
        </div>
      </div>

      <Button type="button" onClick={handleFreelancerStep2Next}
        disabled={loading || !formData.country || (freelancerSelectedCountry.code === 'PH' && (!formData.provinceCode || !formData.cityCode)) || freelancerEmploymentTypes.length === 0 || !formData.skills.trim()}
        className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? 'Uploading Resume...' : 'Continue'}
      </Button>
    </div>
  );

  const renderFreelancerStep3 = () => (
    <form className="space-y-6" onSubmit={handleFreelancerSubmit} noValidate>
      {/* Gov ID Card Upload (Optional during sign-up) */}
      <div className="space-y-4 border-b border-border/60 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Government Valid ID (Optional)</p>
        
        <div className="space-y-1">
          <label htmlFor="flGovIdType" className="block text-sm font-medium text-foreground">
            Government ID Type
          </label>
          <Select value={freelancerGovIdType} onValueChange={setFreelancerGovIdType} disabled={loading}>
            <SelectTrigger id="flGovIdType" className="h-12 border-2 border-border focus:ring-0 focus:border-primary text-base">
              <SelectValue placeholder="Select ID Type" />
            </SelectTrigger>
            <SelectContent>
              {GOV_ID_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Front ID */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Front Side of ID</label>
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/10 transition-colors relative h-36 flex flex-col justify-center items-center">
              <input type="file" accept="image/*,application/pdf" disabled={loading}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFreelancerGovIdFrontFile(file);
                    if (file.type.startsWith('image/')) {
                      setFreelancerGovIdFrontPreview(URL.createObjectURL(file));
                    } else {
                      setFreelancerGovIdFrontPreview(null);
                    }
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer" />
              {freelancerGovIdFrontPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={freelancerGovIdFrontPreview} alt="Front ID Preview" className="max-h-full object-contain" />
              ) : (
                <>
                  <Upload size={24} className="text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground font-semibold">{freelancerGovIdFrontFile?.name || 'Upload Front ID'}</span>
                </>
              )}
            </div>
            {freelancerGovIdFrontFile && (
              <button type="button" onClick={() => { setFreelancerGovIdFrontFile(null); setFreelancerGovIdFrontPreview(null); setFreelancerGovIdFrontFileId(null); }}
                className="text-xs text-destructive font-semibold hover:underline block cursor-pointer">Remove Front ID</button>
            )}
          </div>

          {/* Back ID */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Back Side of ID / Selfie</label>
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/10 transition-colors relative h-36 flex flex-col justify-center items-center">
              <input type="file" accept="image/*,application/pdf" disabled={loading}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFreelancerGovIdBackFile(file);
                    if (file.type.startsWith('image/')) {
                      setFreelancerGovIdBackPreview(URL.createObjectURL(file));
                    } else {
                      setFreelancerGovIdBackPreview(null);
                    }
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer" />
              {freelancerGovIdBackPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={freelancerGovIdBackPreview} alt="Back ID Preview" className="max-h-full object-contain" />
              ) : (
                <>
                  <Upload size={24} className="text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground font-semibold">{freelancerGovIdBackFile?.name || 'Upload Back ID'}</span>
                </>
              )}
            </div>
            {freelancerGovIdBackFile && (
              <button type="button" onClick={() => { setFreelancerGovIdBackFile(null); setFreelancerGovIdBackPreview(null); setFreelancerGovIdBackFileId(null); }}
                className="text-xs text-destructive font-semibold hover:underline block cursor-pointer">Remove Back ID</button>
            )}
          </div>
        </div>
        {freelancerErrors.govIdType && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.govIdType}</p>}
        {freelancerErrors.govIdFront && <p className="text-xs text-destructive mt-1 font-medium">{freelancerErrors.govIdFront}</p>}
      </div>

      {/* Compliance Preferences */}
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox id="f-marketing-checkbox" checked={freelancerMarketingConsent}
            onCheckedChange={val => setFreelancerMarketingConsent(Boolean(val))}
            className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary text-white" />
          <span className="text-sm text-muted-foreground leading-tight select-none">
            Send me helpful emails to find rewarding work and job leads.
          </span>
        </label>

        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox id="f-terms-checkbox" checked={freelancerTermsAgreed}
              onCheckedChange={val => { setFreelancerTermsAgreed(Boolean(val)); if (freelancerErrors.terms) setFreelancerErrors(prev => ({ ...prev, terms: '' })); }}
              className={cn('mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary text-white', freelancerErrors.terms && 'border-destructive')} />
            <span className={cn('text-sm leading-tight select-none', freelancerErrors.terms ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              Yes, I understand and agree to the{' '}
              <Link href="#" className="text-primary hover:underline font-medium">VOS Sync Terms of Service</Link>, including the{' '}
              <Link href="#" className="text-primary hover:underline font-medium">User Agreement</Link> and{' '}
              <Link href="#" className="text-primary hover:underline font-medium">Privacy Policy</Link>.
              <span className="text-destructive ml-0.5">*</span>
            </span>
          </label>
          {freelancerErrors.terms && <p className="text-xs text-destructive mt-1.5 font-medium pl-7">{freelancerErrors.terms}</p>}
        </div>
      </div>

      {/* CAPTCHA / Bot Protection */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 my-2">
        <TurnstileWidget
          onVerify={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken('')}
        />
      </div>

      <Button type="submit"
        disabled={loading || !freelancerTermsAgreed || !turnstileToken || (Boolean(freelancerGovIdType || freelancerGovIdFrontFile || freelancerGovIdBackFile) && (!freelancerGovIdType || !freelancerGovIdFrontFile || !freelancerGovIdBackFile))}
        className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? 'Creating...' : 'Create Job Seeker Account'}
      </Button>
    </form>
  );

  const renderFreelancerForm = () => (
    <div className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-12">
      <div className="mb-6">
        <button onClick={handleFreelancerBack} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} className="mr-2" />
          {freelancerStep === 1 ? 'Back to selection' : `Back to Step ${freelancerStep - 1}`}
        </button>
      </div>

      <StepIndicator currentStep={freelancerStep} steps={FREELANCER_STEPS} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-medium text-primary">Create your Job Seeker account</h1>
        <p className="mt-3 text-muted-foreground">
          {freelancerStep === 1 && 'Set up your basic login and contact credentials.'}
          {freelancerStep === 2 && 'Tell us about your professional skills and location.'}
          {freelancerStep === 3 && 'Upload your validation document and finalize security.'}
        </p>
      </div>

      {freelancerStep === 1 && renderFreelancerStep1()}
      {freelancerStep === 2 && renderFreelancerStep2()}
      {freelancerStep === 3 && renderFreelancerStep3()}

      {freelancerStep === 1 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">Log In</Link>
        </div>
      )}
    </div>
  );

  // ─── Render: Freelancer OTP ───────────────────────────────────────────────

  const renderFreelancerOtpScreen = () => (
    <div className="w-full max-w-sm mx-auto px-4 sm:px-6 py-12 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-medium text-primary mb-4">Verify your email</h1>
        <p className="text-muted-foreground">
          We&apos;ve sent a 6-digit verification code to <strong>{otpEmail}</strong>. Please enter it below to verify your account.
        </p>
      </div>
      <form onSubmit={handleFreelancerOtpSubmit} className="space-y-6">
        <Input id="otp" type="text" maxLength={6} value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} disabled={loading} placeholder="000000"
          className="h-16 text-center text-3xl tracking-[1em] font-mono border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
        <Button type="submit" disabled={loading || otp.length !== 6}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg">
          {loading ? 'Verifying...' : 'Verify Email'}
        </Button>
      </form>
    </div>
  );

  // ─── School Signup Submit Handlers ────────────────────────────────────────

  const validateSchoolForm = () => {
    const e: Record<string, string> = {};
    if (!schoolFormData.firstName.trim()) e.firstName = 'First name is required';
    if (!schoolFormData.lastName.trim()) e.lastName = 'Last name is required';
    if (!schoolFormData.email.trim()) e.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(schoolFormData.email)) e.email = 'Please enter a valid email';
    
    if (!schoolFormData.contact.trim()) {
      e.contact = 'Contact number is required';
    } else {
      const cleanDigits = schoolFormData.contact.replace(/\D/g, '');
      const full = `${schoolSelectedCountry.dialCode} ${schoolFormData.contact.trim()}`;
      const fullClean = `${schoolSelectedCountry.dialCode} ${cleanDigits}`;
      if (
        !schoolSelectedCountry.regex.test(full) &&
        !schoolSelectedCountry.regex.test(schoolFormData.contact.trim()) &&
        !schoolSelectedCountry.regex.test(fullClean) &&
        !schoolSelectedCountry.regex.test(cleanDigits)
      ) {
        e.contact = `Invalid format for ${schoolSelectedCountry.name}.`;
      }
    }

    if (!schoolFormData.schoolName.trim()) e.schoolName = 'School Name is required';
    if (!schoolFormData.province.trim()) e.province = 'Province is required';
    if (!schoolFormData.city.trim()) e.city = 'City / Municipality is required';

    if (!schoolFormData.password) e.password = 'Password is required';
    else if (!validatePasswordStrict(schoolFormData.password)) e.password = 'Password does not meet requirements';
    if (schoolFormData.password !== schoolFormData.confirmPassword) e.confirmPassword = 'Passwords do not match';

    if (!schoolTermsAgreed) e.terms = 'You must agree to the terms';

    setSchoolErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSchoolForm()) {
      toast.error('Please fix the validation errors.');
      return;
    }

    setLoading(true);
    try {
      const dialCode = schoolSelectedCountry.dialCode;
      const rawContact = schoolFormData.contact.trim().replace(/^0/, '');
      const fullContact = `${dialCode}${rawContact}`;

      const res = await fetch('/api/auth/school-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteToken || undefined,
          user_fname: schoolFormData.firstName.trim(),
          user_lname: schoolFormData.lastName.trim(),
          user_contact: fullContact,
          user_email: schoolFormData.email.trim().toLowerCase(),
          password: schoolFormData.password,
          school_name: schoolFormData.schoolName.trim(),
          school_type: schoolFormData.schoolType,
          city_municipality: schoolFormData.city,
          province: schoolFormData.province,
          turnstileToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error('Signup failed', { description: data.error || 'Could not register school.' });
        return;
      }

      toast.success('Registration successful!', { description: 'Please check your email for the verification code.' });
      setSchoolUserId(data.userId);
      setOtpEmail(schoolFormData.email.trim());
      setStep('school-otp');
    } catch {
      toast.error('Signup failed', { description: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: schoolUserId, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Verification failed', { description: data.message || 'Invalid code.' });
        return;
      }
      toast.success('Account verified!', { description: 'Welcome to VOS Sync. You can now log in.' });
      window.location.href = '/login';
    } catch {
      toast.error('Verification failed', { description: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render: School Form ──────────────────────────────────────────────────

  const renderSchoolForm = () => (
    <div className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-12">
      <div className="mb-6">
        <button onClick={handleBackToSelection} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} className="mr-2" />Back to selection
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-medium text-primary">Register your School</h1>
        <p className="mt-3 text-muted-foreground">Submit institution details and set up admin access.</p>
      </div>

      <form className="space-y-6" onSubmit={handleSchoolSubmit} noValidate>
        {/* Personal Details */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Personal Info</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium">First name <span className="text-destructive">*</span></label>
              <Input id="s-fname" value={schoolFormData.firstName}
                onChange={e => setSchoolFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="First Name" className={cn('h-12 border-2', schoolErrors.firstName && 'border-destructive')} />
              {schoolErrors.firstName && <p className="text-xs text-destructive mt-1">{schoolErrors.firstName}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">Last name <span className="text-destructive">*</span></label>
              <Input id="s-lname" value={schoolFormData.lastName}
                onChange={e => setSchoolFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Last Name" className={cn('h-12 border-2', schoolErrors.lastName && 'border-destructive')} />
              {schoolErrors.lastName && <p className="text-xs text-destructive mt-1">{schoolErrors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">Mobile Number <span className="text-destructive">*</span></label>
            <PhoneCountryPicker selectedCountry={schoolSelectedCountry}
              onSelectCountry={setSchoolSelectedCountry}
              phoneValue={schoolFormData.contact}
              onPhoneChange={val => setSchoolFormData(prev => ({ ...prev, contact: val }))}
              error={schoolErrors.contact} disabled={loading} />
            {schoolErrors.contact && <p className="text-xs text-destructive mt-1">{schoolErrors.contact}</p>}
          </div>
        </div>

        {/* Institution Details */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">School Details</p>
          
          <div className="space-y-1">
            <label className="block text-sm font-medium">School / University Name <span className="text-destructive">*</span></label>
            <Input id="s-name" value={schoolFormData.schoolName}
              onChange={e => setSchoolFormData(prev => ({ ...prev, schoolName: e.target.value }))}
              disabled={!!inviteToken || loading}
              placeholder="Full official school name" className={cn('h-12 border-2', schoolErrors.schoolName && 'border-destructive')} />
            {schoolErrors.schoolName && <p className="text-xs text-destructive mt-1">{schoolErrors.schoolName}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">School Type <span className="text-destructive">*</span></label>
            <Select value={schoolFormData.schoolType} 
              onValueChange={val => setSchoolFormData(prev => ({ ...prev, schoolType: val as 'University' | 'College' | 'Technical/Vocational' | 'Other' }))} disabled={loading}>
              <SelectTrigger className="h-12 border-2 text-base">
                <SelectValue placeholder="Select School Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="University">University</SelectItem>
                <SelectItem value="College">College</SelectItem>
                <SelectItem value="Technical/Vocational">Technical/Vocational</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">School Contact / Login Email <span className="text-destructive">*</span></label>
            <Input id="s-email" type="email" value={schoolFormData.email}
              onChange={e => setSchoolFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={!!inviteToken || loading}
              placeholder="e.g. admin@school.edu" className={cn('h-12 border-2', schoolErrors.email && 'border-destructive')} />
            {schoolErrors.email && <p className="text-xs text-destructive mt-1">{schoolErrors.email}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium">Province <span className="text-destructive">*</span></label>
              <SearchableLocationSelect options={provinces} value={schoolFormData.provinceCode}
                onChange={(code, name) => setSchoolFormData(prev => ({ ...prev, provinceCode: code, province: name, cityCode: '', city: '' }))}
                placeholder="Search province..." loading={loadingProvinces} error={schoolErrors.province} />
              {schoolErrors.province && <p className="text-xs text-destructive mt-1">{schoolErrors.province}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">City / Municipality <span className="text-destructive">*</span></label>
              <SearchableLocationSelect options={cities} value={schoolFormData.cityCode}
                onChange={(code, name) => setSchoolFormData(prev => ({ ...prev, cityCode: code, city: name }))}
                placeholder="Search city..." disabled={!schoolFormData.provinceCode} loading={loadingCities} error={schoolErrors.city} />
              {schoolErrors.city && <p className="text-xs text-destructive mt-1">{schoolErrors.city}</p>}
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Credentials</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Password <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Input id="s-password" type={schoolShowPassword ? 'text' : 'password'} value={schoolFormData.password}
                    onChange={e => setSchoolFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="8+ characters" className={cn('h-12 pr-12 border-2', schoolErrors.password && 'border-destructive')} />
                  <button type="button" onClick={() => setSchoolShowPassword(!schoolShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {schoolShowPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {schoolErrors.password && <p className="text-xs text-destructive mt-1">{schoolErrors.password}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium">Confirm Password <span className="text-destructive">*</span></label>
                <Input id="s-confirm" type={schoolShowPassword ? 'text' : 'password'} value={schoolFormData.confirmPassword}
                  onChange={e => setSchoolFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm password" className={cn('h-12 border-2', schoolErrors.confirmPassword && 'border-destructive')} />
                {schoolErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{schoolErrors.confirmPassword}</p>}
              </div>
            </div>
            <PasswordRequirementsChecklist password={schoolFormData.password} confirmPassword={schoolFormData.confirmPassword} className="mt-1" />
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox id="s-terms-checkbox" checked={schoolTermsAgreed}
                onCheckedChange={val => setSchoolTermsAgreed(Boolean(val))}
                className={cn('mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary text-white', schoolErrors.terms && 'border-destructive')} />
              <span className={cn('text-sm leading-tight select-none', schoolErrors.terms ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                Yes, I understand and agree to the{' '}
                <Link href="#" className="text-primary hover:underline font-medium">VOS Sync Terms of Service</Link>, including the{' '}
                <Link href="#" className="text-primary hover:underline font-medium">User Agreement</Link> and{' '}
                <Link href="#" className="text-primary hover:underline font-medium">Privacy Policy</Link>.
                <span className="text-destructive ml-0.5">*</span>
              </span>
            </label>
            {schoolErrors.terms && <p className="text-xs text-destructive mt-1.5 font-medium pl-7">{schoolErrors.terms}</p>}
          </div>
        </div>

        {/* CAPTCHA / Bot Protection */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 my-2">
          <TurnstileWidget
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken('')}
          />
        </div>

        <Button type="submit" disabled={loading || !validatePasswordStrict(schoolFormData.password)}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg disabled:opacity-50">
          {loading ? 'Creating...' : 'Create School Account'}
        </Button>
      </form>
    </div>
  );

  // ─── Render: School OTP ───────────────────────────────────────────────────

  const renderSchoolOtpScreen = () => (
    <div className="w-full max-w-sm mx-auto px-4 sm:px-6 py-12 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-medium text-primary mb-4">Verify your school email</h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent a 6-digit verification code to <strong>{otpEmail}</strong>. Please enter it below to verify your account.
        </p>
      </div>
      <form onSubmit={handleSchoolOtpSubmit} className="space-y-6">
        <Input id="s-otp" type="text" maxLength={6} value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} disabled={loading} placeholder="000000"
          className="h-16 text-center text-3xl tracking-[1em] font-mono border-2 border-border focus-visible:ring-0 focus-visible:border-primary" />
        <Button type="submit" disabled={loading || otp.length !== 6}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg">
          {loading ? 'Verify & Finish' : 'Verify Email'}
        </Button>
      </form>
    </div>
  );

  // ─── Root Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 font-sans selection:bg-primary/20">
      {step === 'selection' && renderSelectionScreen()}

      {step === 'client' && (
        <>
          {clientStep === 1 && renderClientStep1()}
          {clientStep === 2 && renderClientStep2()}
          {clientStep === 3 && renderClientStep3()}
          {clientStep === 4 && renderClientStep4()}
        </>
      )}

      {step === 'client-otp' && renderClientOtpScreen()}
      {step === 'freelancer' && renderFreelancerForm()}
      {step === 'freelancer-otp' && renderFreelancerOtpScreen()}
      {step === 'school' && renderSchoolForm()}
      {step === 'school-otp' && renderSchoolOtpScreen()}
    </div>
  );
}


export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}

