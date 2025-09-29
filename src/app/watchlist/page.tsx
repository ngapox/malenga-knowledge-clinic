'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

export default function WatchlistPage() {
  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Data
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<LatestMap>({}); // SYMBOL -> { close, date }

  // Form
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

  // ===== Auth =====
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setUserId(session?.user?.id ?? null);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (cancelled) return;
      setUserId(session?.user?.id ?? null);
      setLoadingAuth(false);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  // ===== Load items =====
  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('watchlist_items')
      .select('*')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ===== Load latest quotes for symbols on the list =====
  useEffect(() => {
    (async () => {
      if (items.length === 0) {
        setLatest({});
        return;
      }
      const symbols = Array.from(new Set(items.map(i => i.symbol.toUpperCase())));
      if (symbols.length === 0) {
        setLatest({});
        return;
      }

      const { data, error } = await supabase
        .from('dse_quotes')
        .select('symbol, as_of_date, close')
        .in('symbol', symbols);

      if (error || !data) {
        setLatest({});
        return;
      }

      // keep most recent per symbol
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

  // ===== Helpers =====
  const grouped = useMemo(() => {
    const g: Record<string, WatchItem[]> = {};
    for (const it of items) {
      g[it.kind] ||= [];
      g[it.kind].push(it);
    }
    return g;
  }, [items]);

  const resetForm = () => {
    setKind('stock'); setSymbol(''); setName(''); setMarket('DSE');
    setTarget(''); setAbove(''); setBelow(''); setNotes('');
  };

  const addItem = async () => {
    if (!userId) return;
    const sym = symbol.trim().toUpperCase();
    if (!sym) { setMessage('Symbol is required'); return; }

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

    const { data, error } = await supabase
      .from('watchlist_items')
      .insert(payload)
      .select('*')
      .single();

    setSaving(false);

    if (error) {
      // 23505 = unique violation (duplicate)
      const code = (error as any)?.code;
      if (code === '23505') {
        setMessage('Already in your watchlist.');
      } else {
        setMessage(error.message);
      }
      return;
    }

    setItems(prev => [...prev, data as WatchItem].sort((a, b) =>
      a.kind.localeCompare(b.kind) || a.symbol.localeCompare(b.symbol)
    ));
    resetForm();
  };

  const removeItem = async (id: string) => {
    if (!confirm('Remove from your watchlist?')) return;
    const { error } = await supabase.from('watchlist_items').delete().eq('id', id);
    if (!error) setItems(prev => prev.filter(x => x.id !== id));
    else alert(error.message);
  };

  const quickUpdate = async (id: string, patch: Partial<WatchItem>) => {
    const { error } = await supabase.from('watchlist_items').update(patch).eq('id', id);
    if (!error) setItems(prev => prev.map(x => (x.id === id ? { ...x, ...patch } as WatchItem : x)));
  };

  const formatPrice = (n: number | null | undefined) =>
    typeof n === 'number' ? n.toLocaleString() : '—';

  // ===== Render =====
  if (loadingAuth) return <div className="p-6">Checking session…</div>;
  if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a> to use your watchlist.</div>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Your Watchlist</h1>

      {/* Add form */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold">Add an item</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <select
            className="rounded-lg border p-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as WatchItem['kind'])}
          >
            {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <input
            className="rounded-lg border p-2"
            placeholder="Symbol e.g. TBL"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
          <input
            className="rounded-lg border p-2"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border p-2"
            placeholder="Market (e.g., DSE)"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
          />
          <button
            onClick={addItem}
            disabled={saving}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border p-2"
            placeholder="Target price (optional)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <input
            className="rounded-lg border p-2"
            placeholder="Alert above (optional)"
            value={above}
            onChange={(e) => setAbove(e.target.value)}
          />
          <input
            className="rounded-lg border p-2"
            placeholder="Alert below (optional)"
            value={below}
            onChange={(e) => setBelow(e.target.value)}
          />
        </div>

        <textarea
          className="mt-3 w-full rounded-lg border p-2"
          rows={2}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {message && <div className="mt-2 text-sm text-gray-600">{message}</div>}
      </section>

      {/* List */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Items</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadItems}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-3 text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-3 text-sm text-gray-500">No items yet. Add your first one above.</div>
        ) : (
          <div className="mt-3 space-y-6">
            {Object.keys(grouped).sort().map((k) => (
              <div key={k}>
                <div className="mb-2 text-sm font-semibold uppercase text-gray-500">{k}</div>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Symbol</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Market</th>
                        <th className="p-2 text-left">Last (TZS)</th>
                        <th className="p-2 text-left">Target</th>
                        <th className="p-2 text-left">Alert ≥</th>
                        <th className="p-2 text-left">Alert ≤</th>
                        <th className="p-2 text-left">Notes</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[k].map((it) => {
                        const latestFor = latest[it.symbol?.toUpperCase()];
                        return (
                          <tr key={it.id} className="border-t">
                            <td className="p-2 font-medium">{it.symbol}</td>
                            <td className="p-2">{it.name}</td>
                            <td className="p-2">{it.market}</td>
                            <td className="p-2" title={latestFor?.date ?? ''}>
                              {latestFor ? formatPrice(latestFor.close) : '—'}
                            </td>
                            <td className="p-2">
                              <input
                                className="w-24 rounded border p-1"
                                defaultValue={it.target_price ?? ''}
                                onBlur={(e) =>
                                  quickUpdate(it.id, {
                                    target_price: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-24 rounded border p-1"
                                defaultValue={it.alert_above ?? ''}
                                onBlur={(e) =>
                                  quickUpdate(it.id, {
                                    alert_above: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-24 rounded border p-1"
                                defaultValue={it.alert_below ?? ''}
                                onBlur={(e) =>
                                  quickUpdate(it.id, {
                                    alert_below: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-full rounded border p-1"
                                defaultValue={it.notes ?? ''}
                                onBlur={(e) => quickUpdate(it.id, { notes: e.target.value || null })}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <button
                                onClick={() => removeItem(it.id)}
                                className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-gray-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
