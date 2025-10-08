'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type Opportunity = {
  id: string;
  title: string;
  content: string | null;
  opportunity_type: string;
  action_date: string | null;
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
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!data?.is_admin) { router.push('/'); return; }
      setIsAdmin(true);
      setLoading(false);
      loadOpportunities();
    };
    checkAdmin();
  }, [router]);

  const loadOpportunities = async () => {
    const { data } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false });
    if (data) setOpportunities(data as Opportunity[]);
  };

  const clearForm = () => {
    setTitle('');
    setContent('');
    setType('BOND');
    setActionDate('');
    setFile(null);
    setEditingId(null);
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
        setIsSaving(false);
        return;
    }

    let pdfPublicUrl = null;

    if (file) {
      const filePath = `public/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('opportunity_pdfs').upload(filePath, file);
      if (uploadError) { 
        alert(`Error uploading file: ${uploadError.message}`); 
        setIsSaving(false); 
        return; 
      }
      const { data: urlData } = supabase.storage.from('opportunity_pdfs').getPublicUrl(filePath);
      pdfPublicUrl = urlData.publicUrl;
    }

    const payload: any = {
      title,
      content,
      opportunity_type: type,
      action_date: actionDate || null,
      created_by: user.id,
    };
    if (editingId) {
      payload.id = editingId;
    }
    if (pdfPublicUrl) {
      payload.pdf_url = pdfPublicUrl;
    }

    const { error } = await supabase.from('opportunities').upsert(payload);
    if (error) {
      alert(error.message);
    } else {
      clearForm();
      await loadOpportunities();
    }
    setIsSaving(false);
  };

  const loadOpportunityForEdit = (opportunity: Opportunity) => {
    setEditingId(opportunity.id);
    setTitle(opportunity.title);
    setContent(opportunity.content || '');
    setType(opportunity.opportunity_type);
    setActionDate(opportunity.action_date ? new Date(opportunity.action_date).toISOString().split('T')[0] : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (opportunityId: string, opportunityTitle: string) => {
    if (!confirm(`Are you sure you want to delete the opportunity "${opportunityTitle}"? This cannot be undone.`)) {
      return;
    }
    const { error } = await supabase.from('opportunities').delete().eq('id', opportunityId);
    if (error) {
      alert(`Error deleting: ${error.message}`);
    } else {
      await loadOpportunities();
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Unauthorized.</div>;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Opportunities</h1>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{editingId ? 'Edit Opportunity' : 'Create New Opportunity'}</CardTitle>
            </div>
            {editingId && (
              <Button variant="outline" onClick={clearForm}>+ New Opportunity</Button>
            )}
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div>
              <Label htmlFor="action-date">Action Date (Optional)</Label>
              <Input id="action-date" type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} />
            </div>
          </div>
          <Textarea placeholder="Details about the opportunity..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
          <div>
              <Label htmlFor="pdf-upload">Attach PDF (Optional)</Label>
              <Input 
                id="pdf-upload" 
                type="file" 
                accept=".pdf"
                className="mt-1 file:text-primary file:font-semibold"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
              />
              <p className="text-xs text-muted-foreground mt-1">If you are editing, only upload a file if you want to replace the existing one.</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Opportunity'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Posted Opportunities</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {opportunities.map(op => (
              <li key={op.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                    <span className="font-semibold">{op.title}</span>
                    <span className="ml-2 text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-md">{op.opportunity_type}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadOpportunityForEdit(op)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(op.id, op.title)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

       <Link href="/admin" className="text-primary hover:underline">&larr; Back to Admin Panel</Link>
    </main>
  );
}