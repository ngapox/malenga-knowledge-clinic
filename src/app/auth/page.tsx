// src/app/auth/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function AuthPage() {
  const router = useRouter();
  // --- 👇 NEW STATE TO TOGGLE BETWEEN VIEWS 👇 ---
  const [view, setView] = useState<'signIn' | 'signUp'>('signIn');
  
  // State for both flows
  const [phone, setPhone] = useState('+255');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // State for the multi-step sign-up flow
  const [signUpStep, setSignUpStep] = useState<'phone' | 'otp'>('phone');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 👇 NEW: HANDLER FOR PHONE/PASSWORD SIGN IN 👇 ---
  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      phone: phone,
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      // Success! Use a full page reload to ensure server components refresh.
      window.location.href = '/';
    }
    setLoading(false);
  };

  // --- REPURPOSED: HANDLERS FOR THE SIGN-UP OTP FLOW ---
  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/otp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setSignUpStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.token,
        refresh_token: result.token,
      });
      if (sessionError) throw sessionError;
      
      // On successful sign-up, the middleware will redirect to /auth/complete-profile
      router.push('/auth/complete-profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)]">
      {view === 'signIn' ? (
        // --- SIGN IN FORM (DEFAULT) ---
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password" passHref>
                <Button variant="link" size="sm" className="p-0 h-auto">
                  Forgot Password?
                </Button>
              </Link>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleSignIn} disabled={loading} className="w-full">
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
            <div className="text-center text-sm">
              Don't have an account?{' '}
              <Button variant="link" size="sm" onClick={() => { setView('signUp'); setError(null); }}>
                Sign Up
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // --- SIGN UP FORM (OTP FLOW) ---
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>
              {signUpStep === 'phone'
                ? 'Enter your phone number to begin.'
                : `We sent a code to ${phone}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {signUpStep === 'phone' ? (
              <div className="space-y-2">
                <Label htmlFor="phone-signup">Phone Number</Label>
                <Input id="phone-signup" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input id="otp" type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={signUpStep === 'phone' ? handleSendOtp : handleVerifyOtp} disabled={loading} className="w-full">
              {loading ? 'Please wait...' : signUpStep === 'phone' ? 'Send Code' : 'Verify & Continue'}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Button variant="link" size="sm" onClick={() => { setView('signIn'); setError(null); }}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}