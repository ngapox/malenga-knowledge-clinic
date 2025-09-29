// --- File: src/app/api/alerts/check/route.ts ---
import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const BEEM_ENDPOINT = process.env.BEEM_SMS_ENDPOINT || 'https://apisms.beem.africa/v1/send';
const BEEM_API_KEY = process.env.BEEM_API_KEY || '';
const BEEM_SECRET = process.env.BEEM_SECRET_KEY || '';
const BEEM_SENDER = process.env.BEEM_SENDER_ID || 'INFO';

function toBeemDest(phoneE164: string): string | null {
  if (!phoneE164) return null;
  const digits = phoneE164.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) return '255' + digits.slice(1);
  return digits;
}

async function sendSMS(dest: string, text: string) {
  const auth = Buffer.from(`${BEEM_API_KEY}:${BEEM_SECRET}`).toString('base64');
  const payload = {
    source_addr: BEEM_SENDER,
    schedule_time: '',
    encoding: 0,
    message: text,
    recipients: [{ recipient_id: '1', dest_addr: dest }],
  };
  const res = await fetch(BEEM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Beem error ${res.status}`);
  return data;
}

export async function GET() {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { data: items, error: wlErr } = await supabaseAdmin
      .from('watchlist_items')
      .select('id, user_id, symbol, alert_above, alert_below');
    if (wlErr) throw wlErr;
    const interesting =
      (items || []).filter(
        (w: any) =>
          (w.alert_above != null && !isNaN(w.alert_above)) || (w.alert_below != null && !isNaN(w.alert_below))
      );
    if (interesting.length === 0) return NextResponse.json({ ok: true, sent: 0 });
    const symbols = Array.from(new Set(interesting.map((w: any) => w.symbol.toUpperCase())));
    const { data: quotes, error: qErr } = await supabaseAdmin
      .from('dse_quotes')
      .select('symbol, as_of_date, close')
      .in('symbol', symbols);
    if (qErr) throw qErr;
    const latest: Record<string, { close: number; date: string }> = {};
    for (const r of quotes || []) {
      const s = (r as any).symbol.toUpperCase();
      const prev = latest[s];
      if (!prev || new Date((r as any).as_of_date) > new Date(prev.date)) {
        latest[s] = { close: Number((r as any).close), date: (r as any).as_of_date };
      }
    }
    const userIds = Array.from(new Set(interesting.map((w: any) => w.user_id)));
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, phone_e164, sms_opt_in')
      .in('id', userIds);
    if (pErr) throw pErr;
    const prefs = new Map<string, { phone: string | null; sms: boolean }>();
    for (const pr of profiles || []) {
      prefs.set((pr as any).id, { phone: (pr as any).phone_e164, sms: Boolean((pr as any).sms_opt_in) });
    }
    let sent = 0;
    for (const w of interesting as any[]) {
      const sym = w.symbol.toUpperCase();
      const lq = latest[sym];
      if (!lq) continue;
      const pr = prefs.get(w.user_id);
      if (!pr?.sms) continue;
      const dest = pr.phone ? toBeemDest(pr.phone) : null;
      if (!dest) continue;
      const triggers: Array<{ rule: 'above' | 'below'; ok: boolean; threshold: number | null }> = [];
      if (w.alert_above != null)
        triggers.push({ rule: 'above', ok: lq.close >= Number(w.alert_above), threshold: Number(w.alert_above) });
      if (w.alert_below != null)
        triggers.push({ rule: 'below', ok: lq.close <= Number(w.alert_below), threshold: Number(w.alert_below) });
      for (const t of triggers) {
        if (!t.ok || t.threshold == null) continue;
        const { data: exists } = await supabaseAdmin
          .from('watchlist_alerts_sent')
          .select('id')
          .eq('watchlist_item_id', w.id)
          .eq('as_of_date', lq.date)
          .eq('rule', t.rule)
          .maybeSingle();
        if (exists) continue;
        const text = `${sym}: ${lq.close} on ${lq.date}. Rule ${
          t.rule === 'above' ? '≥' : '≤'
        } ${t.threshold}. Manage alerts in your Watchlist.`;
        try {
          await sendSMS(dest, text);
        } catch (e) {
          console.error('SMS send failed:', e);
          continue;
        }
        await supabaseAdmin.from('watchlist_alerts_sent').insert({
          watchlist_item_id: w.id,
          symbol: sym,
          as_of_date: lq.date,
          rule: t.rule,
          price: lq.close,
        });
        sent++;
      }
    }
    return NextResponse.json({ ok: true, sent });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Server error', { status: 500 });
  }
}