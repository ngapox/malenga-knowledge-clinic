// src/app/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+255');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handlePasswordReset = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    // We use the custom OTP sender for this flow as well.
    // Note: In a real app, you might want a separate API route for password resets
    // but for simplicity, we can reuse the sign-up OTP sender.
    try {
      const response = await fetch('/api/auth/otp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      // On success, redirect to the reset page with the phone number
      router.push(`/auth/reset-password?phone=${encodeURIComponent(phone)}`);

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
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Enter your phone number to receive a verification code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+255712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}

          <Button onClick={handlePasswordReset} disabled={loading} className="w-full">
            {loading ? 'Sending Code...' : 'Send Verification Code'}
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