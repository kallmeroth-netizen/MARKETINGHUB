// api/curbit-cron.js — Vercel Cron target (every 15 min; see vercel.json)
//
// WHY: the Order Operations page reads a snapshot from Firebase so it loads
// instantly and can switch Today/7/30-day windows without re-hitting Curbit.
// This job refreshes that snapshot: it pulls the last ~31 days of orders +
// the store directory from Curbit and writes a compact copy to Firebase.
//
// It degrades safely: if Curbit isn't configured, or the write fails, it just
// returns a non-200 and the page falls back to its live /api/curbit fetch.
//
// SECURITY: if CRON_SECRET is set, Vercel sends it as `Authorization: Bearer …`
// on scheduled invocations; we require it so the endpoint can't be triggered by
// anyone. Leave it unset to allow open invocation (still read-only vs Curbit).

import { curbitGet, safeText, curbitConfigured } from './curbit.js';

const FIREBASE_SNAPSHOT =
  'https://neighborly-hub-53e4b-default-rtdb.firebaseio.com/curbit_snapshot.json';
const SNAPSHOT_DAYS = 31;
const MAX_PAGES = 40;

function isoDaysAgo(d) { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(0, 0, 0, 0); return t.toISOString(); }

// Keep only the fields the page's aggregate() reads — original names, so the
// client can aggregate the snapshot with no rehydration.
function compact(o) {
  return {
    store_id: o.store_id,
    status: o.status,
    origin: o.origin,
    handoff: o.handoff,
    placed_at: o.placed_at || o.created_at || o.ordered_at || o.order_time || o.received_at || null,
    has_fallen_in_goldilocks_zone: o.has_fallen_in_goldilocks_zone,
    origin_promise_miss_minutes: o.origin_promise_miss_minutes,
    promise_miss_minutes_at_placed: o.promise_miss_minutes_at_placed,
    preparing_duration_minutes: o.preparing_duration_minutes,
    readying_duration_minutes: o.readying_duration_minutes,
    is_long_preparing_anomaly: o.is_long_preparing_anomaly,
    is_prebump_preparing_anomaly: o.is_prebump_preparing_anomaly,
    is_long_readying_anomaly: o.is_long_readying_anomaly,
    is_prebump_readying_anomaly: o.is_prebump_readying_anomaly,
    is_long_full_anomaly: o.is_long_full_anomaly,
  };
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== 'Bearer ' + secret) { res.status(401).json({ error: 'unauthorized' }); return; }
  }
  if (!curbitConfigured()) {
    res.status(501).json({ error: 'Curbit not configured', hint: 'Set CURBIT_SUBSCRIPTION_KEY + CURBIT_TENANT_ID' });
    return;
  }

  try {
    // Store directory
    let stores = [];
    try {
      const sr = await curbitGet('/orders/v1/stores');
      if (sr.ok) { const sj = await sr.json(); stores = (sj.data || []).map(s => ({ store_id: s.store_id, name: s.name })); }
    } catch (_) {}

    // Orders, last SNAPSHOT_DAYS, auto-paginated
    const from = isoDaysAgo(SNAPSHOT_DAYS);
    const to = new Date().toISOString();
    const base = '/orders/v1?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
    const orders = []; let cursor = null; let pages = 0;
    do {
      const r = await curbitGet(base + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
      if (!r.ok) { res.status(r.status).json({ error: 'orders fetch failed', status: r.status, body: await safeText(r) }); return; }
      const j = await r.json();
      if (Array.isArray(j.data)) j.data.forEach(o => orders.push(compact(o)));
      cursor = (j.pagination && j.pagination.next_cursor) || null;
      pages += 1;
    } while (cursor && pages < MAX_PAGES);

    const snapshot = { updatedAt: new Date().toISOString(), days: SNAPSHOT_DAYS, stores, orders };

    // Write to Firebase (auth query param if a DB secret is provided)
    const url = FIREBASE_SNAPSHOT + (process.env.FIREBASE_DB_SECRET ? '?auth=' + encodeURIComponent(process.env.FIREBASE_DB_SECRET) : '');
    const w = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
    if (!w.ok) { res.status(502).json({ error: 'snapshot write failed', status: w.status, body: await safeText(w) }); return; }

    res.status(200).json({ ok: true, updatedAt: snapshot.updatedAt, orders: orders.length, stores: stores.length, pages });
  } catch (err) {
    res.status(502).json({ error: 'cron failed', detail: String(err && err.message || err) });
  }
}
