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
  // --- 👇 NEW STATE FOR PASSWORD 👇 ---
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
    setError(null);

    // --- 👇 UPDATED VALIDATION 👇 ---
    if (!userId || !fullName || !phone || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }

    setSaving(true);

    try {
      // Step 1: Update the user's password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password: password });
      if (authError) throw authError;

      // Step 2: Update the public profile information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_e164: phone,
        })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Step 3: Success! Redirect to the main app.
      alert('Profile completed! You can now log in with your phone and password.');
      window.location.href = '/';

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
          {/* --- 👇 NEW PASSWORD FIELDS 👇 --- */}
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