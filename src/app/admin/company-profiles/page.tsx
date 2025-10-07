'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

type Profile = {
  symbol: string;
  company_name: string;
  sector: string;
  website: string;
  description: string;
};

export default function AdminCompanyProfilesPage() {
  const router = useRouter();
  const [loading, setLoading]  = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  // Form state
  const [symbol, setSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) { router.push('/'); return; }

    const { data } = await supabase.from('company_profiles').select('*').order('symbol');
    if (data) setProfiles(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!symbol || !companyName) {
      setFormMessage('Symbol and Company Name are required.');
      return;
    }
    setIsSaving(true);
    setFormMessage(null);

    const { error } = await supabase.from('company_profiles').upsert({
      symbol: symbol.toUpperCase(),
      company_name: companyName,
      sector,
      website,
      description,
    });

    if (error) {
      setFormMessage(`Error: ${error.message}`);
    } else {
      setFormMessage(`Successfully saved profile for ${symbol.toUpperCase()}.`);
      // Clear form
      setSymbol('');
      setCompanyName('');
      setSector('');
      setWebsite('');
      setDescription('');
      await loadData(); // Refresh list
    }
    setIsSaving(false);
  };

  const loadProfileForEdit = (profile: Profile) => {
    setSymbol(profile.symbol);
    setCompanyName(profile.company_name);
    setSector(profile.sector || '');
    setWebsite(profile.website || '');
    setDescription(profile.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) return <div>Loading...</div>;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Company Profiles</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Add or Edit Profile</CardTitle>
          <CardDescription>Enter a DSE symbol. If it exists, its data will be loaded for editing. If not, a new profile will be created.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Symbol (e.g., CRDB)" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <Input placeholder="Company Name (e.g., CRDB Bank Plc)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <Input placeholder="Sector (e.g., Banks, Finance & Investment)" value={sector} onChange={(e) => setSector(e.target.value)} />
          <Input placeholder="Website (e.g., https://crdbbank.co.tz)" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <Textarea placeholder="Company Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6}/>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Profile'}</Button>
          {formMessage && <p className="text-sm text-muted-foreground">{formMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Company Profiles</CardTitle></CardHeader>
        <CardContent>
            <ul className="space-y-2">
                {profiles.map(p => (
                    <li key={p.symbol} className="flex justify-between items-center p-2 border rounded-md">
                        <span className="font-bold">{p.symbol} - {p.company_name}</span>
                        <Button variant="outline" size="sm" onClick={() => loadProfileForEdit(p)}>Edit</Button>
                    </li>
                ))}
            </ul>
        </CardContent>
      </Card>

      <Link href="/admin" className="text-primary hover:underline">&larr; Back to Admin Panel</Link>
    </main>
  );
}