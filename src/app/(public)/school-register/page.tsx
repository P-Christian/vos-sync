"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";

function SchoolRegisterContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'loading' | 'invalid' | 'form' | 'otp' | 'success'>(token ? 'loading' : 'invalid');
  const [errorMessage, setErrorMessage] = useState(token ? "" : "No invitation token provided.");
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; email: string } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/school-register?token=${token}`);
        const data = await res.json();
        
        if (data.valid) {
          setSchoolInfo({
            name: data.school_name,
            email: data.invited_email
          });
          setStep('form');
        } else {
          let msg = "Invalid invitation link.";
          if (data.reason === 'expired') msg = "This invitation link has expired.";
          if (data.reason === 'used') msg = "This invitation link has already been used.";
          setErrorMessage(msg);
          setStep('invalid');
        }
      } catch {
        setErrorMessage("An error occurred while validating the invitation.");
        setStep('invalid');
      }
    };

    validateToken();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/school-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          user_fname: formData.firstName,
          user_lname: formData.lastName,
          user_contact: formData.contact,
          password: formData.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Registration failed', { description: data.error || 'An error occurred' });
        setLoading(false);
        return;
      }

      toast.success('Account created!', { description: 'Please check your email for the verification code.' });
      
      setUserId(data.userId);
      setStep('otp');
      setLoading(false);
      
    } catch {
      toast.error('Registration failed', { description: 'Network error.' });
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: otp })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Verification failed', { description: data.error || 'Invalid code' });
        setLoading(false);
        return;
      }

      toast.success('Account verified!');
      setStep('success');
      
    } catch {
      toast.error('Verification failed', { description: 'Network error.' });
      setLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border text-center space-y-6">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Invitation Invalid</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Please contact the Vos Sync admin to request a new invitation link.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Return to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Registration Complete!</h2>
            <p className="text-muted-foreground">
              Your account has been verified. The Vos Sync admin will review and approve your school shortly. You will be notified once you are granted full access.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Proceed to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border">
        
        {step === 'form' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold">Set up your Admin Account</h1>
              <p className="text-muted-foreground mt-2">
                Managing <span className="font-semibold text-foreground">{schoolInfo?.name}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">School Email</label>
                <Input value={schoolInfo?.email || ''} disabled className="bg-muted" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium">First name *</label>
                  <Input id="firstName" required value={formData.firstName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium">Last name *</label>
                  <Input id="lastName" required value={formData.lastName} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="contact" className="text-sm font-medium">Contact Number *</label>
                <Input id="contact" type="tel" required value={formData.contact} onChange={handleChange} />
              </div>

              <div className="space-y-2 relative">
                <label htmlFor="password" className="text-sm font-medium">Password *</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password *</label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
            <p className="text-muted-foreground mb-6 text-sm">
              We&apos;ve sent a 6-digit verification code to <span className="font-semibold text-foreground">{schoolInfo?.email}</span>
            </p>

            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono mx-auto max-w-[200px]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={otp.length !== 6 || loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SchoolRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SchoolRegisterContent />
    </Suspense>
  );
}
