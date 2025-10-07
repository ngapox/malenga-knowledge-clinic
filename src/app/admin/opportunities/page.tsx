// src/app/admin/opportunities/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Opportunity = {
  id: string;
  title: string;
  opportunity_type: string;
  created_at: string;
};

export default function AdminOpportunitiesPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('BOND');
  const [actionDate, setActionDate] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!data?.is_admin) {
        router.push('/');
        return;
      }
      setIsAdmin(true);
      setLoading(false);
      loadOpportunities();
    };
    checkAdmin();
  }, [router]);

  const loadOpportunities = async () => {
    const { data } = await supabase.from('opportunities').select('id, title, opportunity_type, created_at').order('created_at', { ascending: false });
    if (data) setOpportunities(data as Opportunity[]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      title,
      content,
      opportunity_type: type,
      action_date: actionDate || null,
      created_by: user.id,
    };

    const { error } = await supabase.from('opportunities').insert(payload);
    if (error) {
      alert(error.message);
    } else {
      setTitle('');
      setContent('');
      setType('BOND');
      setActionDate('');
      loadOpportunities();
    }
    setIsSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Opportunities</h1>
      
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Create New Opportunity</h2>
        <Input placeholder="Opportunity Title (e.g., 25-Year Treasury Bond Auction)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BOND">Bond</SelectItem>
              <SelectItem value="IPO">IPO</SelectItem>
              <SelectItem value="FUND">UTT AMIS Fund</SelectItem>
              <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} />
        </div>
        <Textarea placeholder="Details about the opportunity..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Posting...' : 'Post Opportunity'}</Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Posted Opportunities</h2>
        <ul className="space-y-2">
          {opportunities.map(op => (
            <li key={op.id} className="flex justify-between items-center p-2 border rounded">
              <span>{op.title}</span>
              <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-md">{op.opportunity_type}</span>
            </li>
          ))}
        </ul>
      </div>
       <Link href="/admin" className="text-primary hover:underline">&larr; Back to Admin Panel</Link>
    </main>
  );
}