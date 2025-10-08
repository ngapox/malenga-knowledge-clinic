'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, Book, Award } from 'lucide-react';

// Types for our data
type LearningPath = { id: string; name: string | null; };
type Badge = { id: string; name: string | null; description: string | null; learning_paths: { name: string | null } | null };

export default function AdminBadgesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('Award');
  const [linkedPathId, setLinkedPathId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) { router.push('/'); return; }

    const badgesPromise = supabase.from('badges').select(`id, name, description, learning_paths(name)`);
    const pathsPromise = supabase.from('learning_paths').select('id, name');

    const [{data: badgeData}, {data: pathData}] = await Promise.all([badgesPromise, pathsPromise]);

    if (badgeData) setBadges(badgeData as any);
    if (pathData) setLearningPaths(pathData);
    
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBadge = async () => {
    if (!name) { alert('Please enter a name for the badge.'); return; }
    setIsSaving(true);
    const { error } = await supabase.from('badges').insert({
      name,
      description,
      icon_name: iconName,
      learning_path_id: linkedPathId,
    });
    if (error) {
      alert(error.message);
    } else {
      setName('');
      setDescription('');
      setLinkedPathId(null);
      await loadData();
    }
    setIsSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Badges</h1>
      
      <Card>
        <CardHeader><CardTitle>Create New Badge</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Badge Name (e.g., 'Pathfinder')" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Badge Description (e.g., 'Completed the Beginner's Guide')" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div>
            <label className="text-sm font-medium">Link to Learning Path (Optional)</label>
            <p className="text-xs text-muted-foreground mb-1">Award this badge when a user completes this path.</p>
            <Select onValueChange={(val) => setLinkedPathId(val)} value={linkedPathId || ''}>
                <SelectTrigger><SelectValue placeholder="Select a path..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {learningPaths.map(path => (
                        <SelectItem key={path.id} value={path.id}>{path.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateBadge} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Badge'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Badges</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {badges.map(badge => (
            <div key={badge.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-4">
                    <Award className="w-8 h-8 text-primary"/>
                    <div>
                        <p className="font-bold">{badge.name}</p>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                    </div>
                </div>
                {badge.learning_paths && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-secondary rounded-md">
                        <Book className="w-4 h-4" />
                        <span>{badge.learning_paths.name}</span>
                    </div>
                )}
            </div>
          ))}
          {badges.length === 0 && <p className="text-sm text-muted-foreground">No badges created yet.</p>}
        </CardContent>
      </Card>

       <Link href="/admin" className="text-primary hover:underline">&larr; Back to Admin Panel</Link>
    </main>
  );
}