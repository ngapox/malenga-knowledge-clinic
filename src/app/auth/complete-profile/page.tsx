// src/app/auth/complete-profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        if (user.phone) {
          setPhone(user.phone);
        }
      } else {
        router.replace('/auth');
      }
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const handleSave = async () => {
    console.log('--- [DEBUG] Starting handleSave ---');
    setError(null);
    setSaving(true);

    // --- 1. Validation ---
    console.log('[DEBUG] Step 1: Validating input...');
    if (!userId || !fullName || !phone || !password) {
      const msg = 'Validation failed: Please fill in all fields.';
      setError(msg);
      console.error(`[DEBUG] ${msg}`);
      setSaving(false);
      return;
    }
    if (password !== confirmPassword) {
      const msg = 'Validation failed: Passwords do not match.';
      setError(msg);
      console.error(`[DEBUG] ${msg}`);
      setSaving(false);
      return;
    }
    if (password.length < 6) {
      const msg = 'Validation failed: Password must be at least 6 characters long.';
      setError(msg);
      console.error(`[DEBUG] ${msg}`);
      setSaving(false);
      return;
    }
    console.log('[DEBUG] Step 1: Validation successful.');

    try {
      // --- 2. Update Password in Supabase Auth ---
      console.log('[DEBUG] Step 2: Attempting to update user password in Supabase Auth...');
      const { error: authError } = await supabase.auth.updateUser({ password: password });
      if (authError) {
        console.error('[DEBUG] Step 2 FAILED: Error updating password in Auth.', authError);
        throw authError; // This will stop the process and jump to the catch block
      }
      console.log('[DEBUG] Step 2: Password updated successfully in Supabase Auth.');

      // --- 3. Update Public Profile ---
      console.log('[DEBUG] Step 3: Attempting to update public profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_e164: phone,
        })
        .eq('id', userId);

      if (profileError) {
        console.error('[DEBUG] Step 3 FAILED: Error updating public profile.', profileError);
        throw profileError; // Jump to the catch block
      }
      console.log('[DEBUG] Step 3: Public profile updated successfully.');

      // --- 4. Success and Redirect ---
      console.log('[DEBUG] Step 4: Profile completion successful. Redirecting...');
      alert('Profile completed! You can now log in with your phone and password.');
      window.location.href = '/';

    } catch (err: any) {
      console.error('[DEBUG] An error occurred in the try-catch block:', err);
      setError(err.message);
    } finally {
      setSaving(false);
      console.log('--- [DEBUG] handleSave finished ---');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>Set your name and create a password to secure your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="e.g., Juma Hamisi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              readOnly
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Create Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save and Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}