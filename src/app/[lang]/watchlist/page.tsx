// --- src/app/watchlist/page.tsx ---
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, Variants } from 'framer-motion'; // <-- Import Variants type

// ... (Keep all your other imports)
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2 } from 'lucide-react';


type WatchItem = {
  id: string;
  user_id: string;
  kind: 'stock' | 'bond' | 'fund' | 'other';
  symbol: string;
  name: string | null;
  market: string | null;
  target_price: number | null;
  alert_above: number | null;
  alert_below: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type LatestMap = Record<string, { close: number; date: string }>;

const KINDS: Array<WatchItem['kind']> = ['stock', 'bond', 'fund', 'other'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// --- 👇 THIS IS THE CORRECTED CODE FOR itemVariants 👇 ---
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
        type: "spring",
        stiffness: 100
    }
  },
};


export default function WatchlistPage() {
    // ... (The rest of your component code remains exactly the same)
    const [userId, setUserId] = useState<string | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [items, setItems] = useState<WatchItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [latest, setLatest] = useState<LatestMap>({});
    const [kind, setKind] = useState<WatchItem['kind']>('stock');
    const [symbol, setSymbol] = useState('');
    const [name, setName] = useState('');
    const [market, setMarket] = useState('DSE');
    const [target, setTarget] = useState<string>('');
    const [above, setAbove] = useState<string>('');
    const [below, setBelow] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState<'cards' | 'table'>('cards');


    useEffect(() => {
        let cancelled = false;
        supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        setUserId(session?.user?.id ?? null);
        setLoadingAuth(false);
        });
        const {
        data: { subscription },
        } = supabase.auth.onAuthStateChange((_evt, session) => {
        if (cancelled) return;
        setUserId(session?.user?.id ?? null);
        setLoadingAuth(false);
        });
        return () => {
        cancelled = true;
        subscription.unsubscribe();
        };
    }, []);

    const loadItems = async () => {
        if(!userId) return;
        setLoading(true);
        const { data, error } = await supabase
        .from('watchlist_items')
        .select('*')
        .eq('user_id', userId)
        .order('kind', { ascending: true })
        .order('symbol', { ascending: true });

        if (!error && data) {
        setItems(data as WatchItem[]);
        } else {
        setItems([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!userId) return;
        loadItems();
    }, [userId]);

    useEffect(() => {
        (async () => {
        if (items.length === 0) {
            setLatest({});
            return;
        }
        const symbols = Array.from(new Set(items.map((i) => i.symbol.toUpperCase())));
        if (symbols.length === 0) {
            setLatest({});
            return;
        }

        const { data, error } = await supabase.from('dse_quotes').select('symbol, as_of_date, close').in('symbol', symbols);

        if (error || !data) {
            setLatest({});
            return;
        }

        const map: LatestMap = {};
        for (const row of data as Array<{ symbol: string; as_of_date: string; close: number }>) {
            const s = row.symbol.toUpperCase();
            const prev = map[s];
            if (!prev || new Date(row.as_of_date) > new Date(prev.date)) {
            map[s] = { close: Number(row.close), date: row.as_of_date };
            }
        }
        setLatest(map);
        })();
    }, [items]);

    useEffect(() => {
        const channel = supabase
        .channel('dse_quotes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dse_quotes' }, (payload) => {
            const newQuote = payload.new as { symbol: string; close: number; as_of_date: string };
            const symbol = newQuote.symbol.toUpperCase();

            if (items.some((item) => item.symbol.toUpperCase() === symbol)) {
            setLatest((prev) => ({
                ...prev,
                [symbol]: {
                close: newQuote.close,
                date: newQuote.as_of_date,
                },
            }));
            }
        })
        .subscribe();

        return () => {
        supabase.removeChannel(channel);
        };
    }, [items]);

    const grouped = useMemo(() => {
        const g: Record<string, WatchItem[]> = {};
        for (const it of items) {
        g[it.kind] ||= [];
        g[it.kind].push(it);
        }
        return g;
    }, [items]);

    const resetForm = () => {
        setKind('stock');
        setSymbol('');
        setName('');
        setMarket('DSE');
        setTarget('');
        setAbove('');
        setBelow('');
        setNotes('');
    };

    const addItem = async () => {
        if (!userId) return;
        const sym = symbol.trim().toUpperCase();
        if (!sym) {
        setMessage('Symbol is required');
        return;
        }

        setSaving(true);
        setMessage(null);
        const payload = {
        user_id: userId,
        kind,
        symbol: sym,
        name: name.trim() || null,
        market: market.trim() || null,
        target_price: target ? Number(target) : null,
        alert_above: above ? Number(above) : null,
        alert_below: below ? Number(below) : null,
        notes: notes.trim() || null,
        };

        const { data, error } = await supabase.from('watchlist_items').insert(payload).select('*').single();
        setSaving(false);

        if (error) {
            const code = (error as any)?.code;
            if (code === '23505') {
                setMessage('Already in your watchlist.');
            } else {
                setMessage(error.message);
            }
            return;
        }

        setItems((prev) => [...prev, data as WatchItem].sort((a, b) => a.kind.localeCompare(b.kind) || a.symbol.localeCompare(b.symbol)));
        resetForm();
    };

    const removeItem = async (id: string) => {
        if (!confirm('Remove from your watchlist?')) return;
        const { error } = await supabase.from('watchlist_items').delete().eq('id', id);
        if (!error) setItems((prev) => prev.filter((x) => x.id !== id));
        else alert(error.message);
    };

    const formatPrice = (n: number | null | undefined) => (typeof n === 'number' ? n.toLocaleString() : '—');

    if (loadingAuth) return <div className="p-6">Checking session…</div>;
    if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a> to use your watchlist.</div>;

    return (
        <main className="space-y-6">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold">Your Watchlist</h1>
        </motion.div>
        <Card>
            <CardHeader>
            <CardTitle>Add a new item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Kind</Label>
                        <Select value={kind} onValueChange={(value: string) => setKind(value as WatchItem['kind'])}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a kind" />
                            </SelectTrigger>
                            <SelectContent>
                                {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="symbol">Symbol</Label>
                        <Input id="symbol" placeholder="e.g. TBL" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name (Optional)</Label>
                        <Input id="name" placeholder="Tanzania Breweries" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea id="notes" placeholder="e.g., waiting for dividend announcement" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button onClick={addItem} disabled={saving}>{saving ? 'Adding…' : 'Add to Watchlist'}</Button>
                {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Items</CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant={view === 'cards' ? 'default' : 'outline'} onClick={() => setView('cards')}>Cards</Button>
                    <Button variant={view === 'table' ? 'default' : 'outline'} onClick={() => setView('table')}>Table</Button>
                    <Button variant="ghost" onClick={loadItems} disabled={loading}>Refresh</Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading...</p>
                ) : items.length === 0 ? (
                    <p>No items yet. Add one above.</p>
                ) : view === 'cards' ? (
                    <motion.div
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {items.map((it) => {
                            const latestFor = latest[it.symbol?.toUpperCase()];
                            return (
                                <motion.div
                                    key={it.id}
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.03, transition: { type: "spring", stiffness: 300 } }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex justify-between items-center">
                                                <span>{it.symbol}</span>
                                                <span className="text-2xl font-bold">{latestFor ? `TZS ${formatPrice(latestFor.close)}` : '—'}</span>
                                            </CardTitle>
                                            <CardDescription>{it.name}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground truncate">{it.notes || "No notes"}</p>
                                        </CardContent>
                                        <div className="flex justify-end p-4">
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Symbol</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Kind</TableHead>
                                <TableHead>Last Price (TZS)</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it) => {
                                const latestFor = latest[it.symbol?.toUpperCase()];
                                return (
                                    <TableRow key={it.id}>
                                        <TableCell className="font-medium">{it.symbol}</TableCell>
                                        <TableCell>{it.name}</TableCell>
                                        <TableCell>{it.kind}</TableCell>
                                        <TableCell>{latestFor ? formatPrice(latestFor.close) : '—'}</TableCell>
                                        <TableCell className="max-w-xs truncate">{it.notes}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
        </main>
    );
}