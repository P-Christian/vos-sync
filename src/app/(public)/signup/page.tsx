"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, User, Eye, EyeOff, Check, Apple, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';


const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.21z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'selection' | 'form' | 'otp'>('selection');
  const [userType, setUserType] = useState<'client' | 'freelancer' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    country: 'Philippines',
    contact: ''
  });

  const handleSelection = (type: 'client' | 'freelancer') => {
    setUserType(type);
  };

  const handleProceedToForm = () => {
    if (userType) {
      setStep('form');
      window.scrollTo(0, 0);
    }
  };

  const handleBackToSelection = () => {
    setStep('selection');
    setUserType(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleCountryChange = (val: string) => {
    setFormData(prev => ({ ...prev, country: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        role: userType === 'client' ? 'CLIENT' : 'FREELANCER'
      };

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Signup failed', { description: data.message || 'An error occurred' });
        setLoading(false);
        return;
      }

      toast.success('Account created!', { description: 'Please check your email for the verification code.' });
      
      setUserId(data.userId);
      setStep('otp');
      setLoading(false);
      
    } catch {
      toast.error('Signup failed', { description: 'Network error.' });
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
        toast.error('Verification failed', { description: data.message || 'Invalid code.' });
        setLoading(false);
        return;
      }

      toast.success('Verified!', { description: 'Welcome to Vos Sync.' });

      // Redirect based on role
      if (data?.role_id === 1) {
        router.push('/vos-sync/freelancer/dashboard');
      } else if (data?.role_id === 2) {
        router.push('/vos-sync/client/dashboard');
      } else {
        router.push('/main-dashboard');
      }
    } catch {
      toast.error('Verification failed', { description: 'Network error.' });
      setLoading(false);
    }
  };

  const renderSelectionScreen = () => (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
      <h1 className="text-3xl md:text-4xl font-medium text-primary mb-4">
        Join as a client or freelancer
      </h1>
      <div className="flex justify-center mb-12">
        <span className="text-muted-foreground mr-2">Already have an account?</span>
        <Link href="/login" className="text-primary font-medium hover:underline">Log In</Link>
      </div>

      <div className="flex flex-col gap-4 max-w-xl mx-auto mb-12">
        <button
          onClick={() => handleSelection('client')}
          className="group relative flex items-center justify-between p-6 border-2 border-border rounded-xl text-left transition-all duration-200 hover:border-primary hover:shadow-md hover:bg-muted/50"
        >
          <div className="flex items-center gap-6">
            <div className="p-3 bg-muted text-foreground rounded-lg group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
              <Briefcase size={28} />
            </div>
            <h3 className="text-xl font-medium text-foreground">
              I&apos;m a client, hiring for a project
            </h3>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${userType === 'client' ? 'border-primary bg-primary' : 'border-border'}`}>
            {userType === 'client' && <Check size={16} className="text-white" />}
          </div>
        </button>

        <button
          onClick={() => handleSelection('freelancer')}
          className="group relative flex items-center justify-between p-6 border-2 border-border rounded-xl text-left transition-all duration-200 hover:border-primary hover:shadow-md hover:bg-muted/50"
        >
          <div className="flex items-center gap-6">
            <div className="p-3 bg-muted text-foreground rounded-lg group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
              <User size={28} />
            </div>
            <h3 className="text-xl font-medium text-foreground">
              I&apos;m a freelancer, looking for work
            </h3>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${userType === 'freelancer' ? 'border-primary bg-primary' : 'border-border'}`}>
            {userType === 'freelancer' && <Check size={16} className="text-white" />}
          </div>
        </button>
      </div>

      <div className="max-w-md mx-auto">
        <Button
          onClick={handleProceedToForm}
          disabled={!userType}
          className={`w-full py-6 rounded-full font-medium text-white transition-colors text-lg ${userType
            ? 'bg-primary hover:bg-primary/90'
            : 'bg-muted-foreground/30 cursor-not-allowed hover:bg-muted-foreground/30'
            }`}
        >
          {userType === 'client' ? 'Join as a Client' : userType === 'freelancer' ? 'Apply as a Freelancer' : 'Create Account'}
        </Button>
      </div>
    </div>
  );

  const renderFormScreen = () => (
    <div className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-12">
      <div className="mb-6">
        <button
          onClick={handleBackToSelection}
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to selection
        </button>
      </div>

      <div className="text-center mb-8 relative">
        <h1 className="text-3xl md:text-4xl font-medium text-primary">
          {userType === 'freelancer'
            ? 'Sign up to find work you love'
            : 'Sign up to hire talent'}
        </h1>
      </div>

      <div className="space-y-4 mb-8">
        <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-2 py-6 border-2 border-foreground rounded-full font-medium hover:bg-muted transition-colors text-base cursor-pointer">
          <Apple size={20} />
          Continue with Apple
        </Button>

        <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-2 py-6 border-2 border-foreground rounded-full font-medium hover:bg-muted transition-colors text-base cursor-pointer">
          <GoogleIcon />
          Continue with Google
        </Button>
      </div>

      <div className="relative text-center text-sm text-muted-foreground mb-8 after:content-[''] after:absolute after:top-1/2 after:left-0 after:w-full after:h-[1px] after:bg-border after:-z-10">
        <span className="bg-background px-4 relative z-10">or</span>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="firstName" className="block text-sm font-medium text-foreground">First name</label>
            <Input
              id="firstName"
              required
              value={formData.firstName}
              onChange={handleChange}
              disabled={loading}
              className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="lastName" className="block text-sm font-medium text-foreground">Last name</label>
            <Input
              id="lastName"
              required
              value={formData.lastName}
              onChange={handleChange}
              disabled={loading}
              className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            {userType === 'client' ? 'Work email address' : 'Email'}
          </label>
          <Input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>
        
        <div className="space-y-1">
          <label htmlFor="contact" className="block text-sm font-medium text-foreground">
            Contact Number
          </label>
          <Input
            type="tel"
            id="contact"
            required
            value={formData.contact}
            onChange={handleChange}
            disabled={loading}
            placeholder="+63 912 345 6789"
            className="h-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              id="password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              placeholder="Password (8 or more characters)"
              className="h-12 pr-12 border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="country" className="block text-sm font-medium text-foreground">Country</label>
          <Select value={formData.country} onValueChange={handleCountryChange} disabled={loading}>
            <SelectTrigger id="country" className="h-12 border-2 border-border focus:ring-0 focus:border-primary text-base">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Philippines">Philippines</SelectItem>
              <SelectItem value="United States">United States</SelectItem>
              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 mt-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox id="marketing-checkbox" defaultChecked className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary text-white" />
            <span className="text-sm text-muted-foreground leading-tight select-none">
              {userType === 'freelancer'
                ? 'Send me helpful emails to find rewarding work and job leads.'
                : 'Send me emails with tips on how to find talent that fits my needs.'}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox id="terms-checkbox" required className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary text-white" />
            <span className="text-sm text-muted-foreground leading-tight select-none">
              Yes, I understand and agree to the{' '}
              <Link href="#" className="text-primary hover:underline font-medium">
                Upwork Terms of Service
              </Link>
              , including the{' '}
              <Link href="#" className="text-primary hover:underline font-medium">
                User Agreement
              </Link>{' '}
              and{' '}
              <Link href="#" className="text-primary hover:underline font-medium">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg"
        >
          {loading ? 'Creating...' : 'Create my account'}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Log In
        </Link>
      </div>
    </div>
  );

  const renderOtpScreen = () => (
    <div className="w-full max-w-sm mx-auto px-4 sm:px-6 py-12 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-medium text-primary mb-4">Check your email</h1>
        <p className="text-muted-foreground">We&apos;ve sent a 6-digit verification code to <strong>{formData.email}</strong>. Please enter it below to verify your account.</p>
      </div>

      <form onSubmit={handleOtpSubmit} className="space-y-6">
        <div>
          <Input
            id="otp"
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            disabled={loading}
            placeholder="000000"
            className="h-16 text-center text-3xl tracking-[1em] font-mono border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full py-6 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors text-lg"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 font-sans selection:bg-primary/20">
      {step === 'selection' && renderSelectionScreen()}
      {step === 'form' && renderFormScreen()}
      {step === 'otp' && renderOtpScreen()}
    </div>
  );
}
