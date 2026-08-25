// api/curbit-cron.js — Vercel Cron target (see vercel.json)
//
// WHY: the Order Operations page reads a snapshot from Firebase so it loads
// instantly and switches Today/7/30-day + store without re-hitting Curbit.
//
// At real volume (tens of thousands of orders/month) shipping raw orders to the
// browser is far too heavy, so this job AGGREGATES server-side: it streams the
// last ~31 days of orders (via `updated_since`, the 60/min lane) and folds them
// into tiny per-store/per-day rollups — a few KB total — then writes that to
// Firebase. The page reconstructs every metric from the rollups.
//
// Degrades safely: if Curbit isn't configured or the write fails, it returns a
// non-200 and the page falls back to a small live fetch.
//
// SECURITY: if CRON_SECRET is set, Vercel sends it as `Authorization: Bearer …`
// on scheduled invocations; we require it so the endpoint can't be triggered by
// anyone. Leave it unset to allow open invocation (still read-only vs Curbit).

import { curbitGet, safeText, curbitConfigured, ordersArray, pick } from './curbit.js';

const FIREBASE_SNAPSHOT =
  'https://neighborly-hub-53e4b-default-rtdb.firebaseio.com/curbit_snapshot.json';
const SNAPSHOT_DAYS = 31;
const PAGE_SIZE = 5000;   // API max — keeps a month to a handful of pages
const MAX_PAGES = 25;     // 25 * 5000 = 125k orders safety ceiling
const TZ = 'America/Los_Angeles';

function isoDaysAgo(d) { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(0, 0, 0, 0); return t.toISOString(); }

// Day/hour bucketed in the restaurants' timezone so the page's trend axis lands
// on the same calendar days regardless of the viewer's timezone.
const _dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const _hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hour12: false });
function dayKey(t) { return _dayFmt.format(new Date(t)); }            // YYYY-MM-DD
function hourOf(t) { const h = parseInt(_hourFmt.format(new Date(t)), 10); return isNaN(h) ? 0 : (h % 24); }
function daypartOf(h) { if (h >= 5 && h < 11) return 'Morning'; if (h >= 11 && h < 15) return 'Lunch'; if (h >= 15 && h < 22) return 'Dinner'; return 'Late night'; }

function firstNum(o, ks) { for (const k of ks) { const v = o[k]; if (v != null && !isNaN(v)) return Number(v); } return null; }
function firstTs(o, ks) { for (const k of ks) { const v = o[k]; if (v) { const t = Date.parse(v); if (!isNaN(t)) return t; } } return null; }
function orderTs(o) { return firstTs(o, ['placed_at', 'created_at', 'ordered_at', 'order_time', 'received_at']); }
function prepMins(o) { const d = firstNum(o, ['preparing_duration_minutes', 'prep_time_minutes', 'preparing_minutes', 'time_to_prepare_minutes', 'minutes_preparing']); if (d != null) return d; const a = firstTs(o, ['started_at', 'preparing_at', 'prep_started_at', 'started_preparing_at', 'placed_at', 'created_at']); const b = firstTs(o, ['prepared_at', 'finished_preparing_at']); return (a != null && b != null && b >= a) ? (b - a) / 60000 : null; }
function readyMins(o) { const d = firstNum(o, ['readying_duration_minutes', 'ready_time_minutes', 'readying_minutes', 'time_to_ready_minutes', 'minutes_readying']); if (d != null) return d; const a = firstTs(o, ['prepared_at', 'finished_preparing_at']); const b = firstTs(o, ['readied_at', 'ready_at', 'completed_at', 'handed_off_at']); return (a != null && b != null && b >= a) ? (b - a) / 60000 : null; }

const ANOM_KEYS = ['is_long_preparing_anomaly', 'is_prebump_preparing_anomaly', 'is_long_readying_anomaly', 'is_prebump_readying_anomaly', 'is_long_full_anomaly'];

// Status enum: PLACED, STARTED, PREPARED, READIED, DELIVERED, CANCELLED.
// "Completed" = fulfilled = handed off (DELIVERED) or ready for pickup (READIED).
function isCompleted(st) { st = String(st || '').toUpperCase(); return st === 'DELIVERED' || st === 'READIED'; }
// Match cancel-ish statuses (CANCELLED / CANCELED / CANCELLED_BY_* / VOID / REJECTED).
function isCancelled(st) { st = String(st || '').toUpperCase(); return st.indexOf('CANCEL') >= 0 || st.indexOf('VOID') >= 0 || st.indexOf('REJECT') >= 0; }
const EXCLUDE_STORE_RE = /\b(demo|test|sandbox|training)\b/i;   // hide Curbit test stores

// Fold one order into rollups[store_id][dayKey]. Short keys keep the JSON small.
function foldOrder(rollups, o) {
  const sid = o.store_id || 'unknown';
  const t = orderTs(o);
  const dk = t != null ? dayKey(t) : 'unknown';
  const store = rollups[sid] || (rollups[sid] = {});
  const r = store[dk] || (store[dk] = { o: 0, d: 0, c: 0, gzS: 0, gzH: 0, mS: 0, mSum: 0, ot: 0, pS: 0, pC: 0, rS: 0, rC: 0, origin: {}, handoff: {}, daypart: {}, hours: {}, anom: {} });
  r.o++;
  if (isCompleted(o.status)) r.d++;
  if (isCancelled(o.status)) r.c++;
  if (o.origin) r.origin[o.origin] = (r.origin[o.origin] || 0) + 1;
  if (o.handoff) r.handoff[o.handoff] = (r.handoff[o.handoff] || 0) + 1;
  if (o.has_fallen_in_goldilocks_zone != null) { r.gzS++; if (o.has_fallen_in_goldilocks_zone) r.gzH++; }
  let miss = o.origin_promise_miss_minutes; if (miss == null) miss = o.promise_miss_minutes_at_placed;
  if (miss != null && !isNaN(miss)) { r.mS++; r.mSum += Number(miss); if (Number(miss) <= 0) r.ot++; }
  const pm = prepMins(o); if (pm != null && pm >= 0 && pm < 240) { r.pS += pm; r.pC++; }
  const rm = readyMins(o); if (rm != null && rm >= 0 && rm < 240) { r.rS += rm; r.rC++; }
  if (t != null) { const h = hourOf(t); r.hours[h] = (r.hours[h] || 0) + 1; const dp = daypartOf(h); r.daypart[dp] = (r.daypart[dp] || 0) + 1; }
  for (const k of ANOM_KEYS) { if (o[k]) r.anom[k] = (r.anom[k] || 0) + 1; }
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
    // Store directory (drop Curbit's test/demo stores so they never appear)
    let stores = [];
    const excluded = new Set();
    try {
      const sr = await curbitGet('/orders/v1/stores');
      if (sr.ok) {
        const sj = await sr.json();
        for (const s of ordersArray(sj)) {
          if (EXCLUDE_STORE_RE.test(s.name || '')) { excluded.add(s.store_id); continue; }
          stores.push({ store_id: s.store_id, name: s.name });
        }
      }
    } catch (_) {}

    // Orders, last SNAPSHOT_DAYS, via updated_since (60/min lane). Fold each
    // page into rollups then discard the raw orders so memory stays flat.
    const base = '/orders/v1?updated_since=' + encodeURIComponent(isoDaysAgo(SNAPSHOT_DAYS)) + '&page_size=' + PAGE_SIZE;
    const rollups = {}; let cursor = null; let pages = 0; let counted = 0; let total = null;
    do {
      const r = await curbitGet(base + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
      if (!r.ok) { res.status(r.status).json({ error: 'orders fetch failed', status: r.status, body: await safeText(r) }); return; }
      const j = await r.json();
      const arr = ordersArray(j);
      for (const o of arr) { if (excluded.has(o.store_id)) continue; foldOrder(rollups, o); counted++; }
      const pg = j.pagination || j.meta || j.page || {};
      if (total == null) total = pick(pg.total_count, pg.total, pg.count, j.total_count, j.total);
      cursor = pick(pg.next_cursor, pg.nextCursor, pg.cursor, pg.next, j.next_cursor) || null;
      pages += 1;
    } while (cursor && pages < MAX_PAGES);
    const capped = !!cursor;

    const snapshot = { updatedAt: new Date().toISOString(), days: SNAPSHOT_DAYS, tz: TZ, counted, total, capped, stores, rollups };

    // Write to Firebase (auth query param if a DB secret is provided)
    const url = FIREBASE_SNAPSHOT + (process.env.FIREBASE_DB_SECRET ? '?auth=' + encodeURIComponent(process.env.FIREBASE_DB_SECRET) : '');
    const w = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
    if (!w.ok) { res.status(502).json({ error: 'snapshot write failed', status: w.status, body: await safeText(w) }); return; }

    res.status(200).json({ ok: true, updatedAt: snapshot.updatedAt, counted, total, capped, stores: stores.length, pages });
  } catch (err) {
    res.status(502).json({ error: 'cron failed', detail: String(err && err.message || err) });
  }
}
