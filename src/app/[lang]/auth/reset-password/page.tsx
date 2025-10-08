// src/app/auth/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!phone) {
      // If there's no phone number in the URL, send the user back.
      router.replace('/auth/forgot-password');
    }
  }, [phone, router]);

  const handleReset = async () => {
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
     if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
    }

    try {
      // Step 1: Verify the OTP to get a valid session
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

      // Step 2: With a valid session, update the user's password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      
      alert('Password has been reset successfully. Please sign in again.');
      // Sign the user out and send them to the login page
      await supabase.auth.signOut();
      router.push('/auth');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>Enter the code sent to {phone} and create a new password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleReset} disabled={loading} className="w-full">
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>

           <div className="text-center">
            <Link href="/auth" className="text-sm underline">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}