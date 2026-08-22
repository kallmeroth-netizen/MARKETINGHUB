// api/curbit.js — Vercel Serverless Function
// Secure server-side proxy for the Curbit Orders Data API.
//
// WHY THIS EXISTS
// The Curbit subscription key + tenant id are secrets and the Bearer token is
// short-lived. None of them may ever reach the browser. So every Curbit call
// happens here, server-side; the hub page calls THIS endpoint only.
//
// AUTH (2 steps, per the Orders API Consumer Guide)
//   1. POST /auth/v2/token   headers: Ocp-Apim-Subscription-Key, x-tenant-id  -> { idToken } (~60 min)
//   2. GET  /orders/v1 …     headers: Authorization: Bearer <idToken>, Ocp-Apim-Subscription-Key, x-tenant-id
//
// REQUIRED VERCEL ENV VARS (set in Vercel → Settings → Environment Variables;
// never commit real values):
//   CURBIT_SUBSCRIPTION_KEY   the Ocp-Apim-Subscription-Key value
//   CURBIT_TENANT_ID          the x-tenant-id value
// Optional:
//   CURBIT_API_BASE           default https://api.integrations.curbit.com
//   CURBIT_ALLOW_ORIGIN       CORS allowlist (default '*')
//
// USAGE (from the hub page or a cron)
//   GET /api/curbit?resource=stores
//   GET /api/curbit?updated_since=2026-08-01T00:00:00Z&page_size=1000
//   GET /api/curbit?from=2026-08-01T00:00:00Z&to=2026-08-20T23:59:59Z&all=1
//   GET /api/curbit?diag=1   → masked view of the stored credentials
// `all=1` auto-paginates the orders endpoint server-side (repeating the query
// mode + filters on every cursor page, per the docs) up to a safety cap and
// returns the merged { data, total_count, pages }.

// Strip invisible whitespace/newlines and accidental surrounding quotes — a
// pasted trailing newline or wrapping quotes in the Vercel UI is a common,
// invisible cause of "invalid subscription key".
const clean = (v) => (v == null ? v : String(v).trim().replace(/^["']+|["']+$/g, ''));
const BASE = (clean(process.env.CURBIT_API_BASE) || 'https://api.integrations.curbit.com').replace(/\/+$/, '');
const MAX_PAGES = 60;            // safety cap for ?all=1 (60 * 5000 = 300k rows)
const TENANT = () => clean(process.env.CURBIT_TENANT_ID);
const SUBKEY = () => clean(process.env.CURBIT_SUBSCRIPTION_KEY);

// Module-level token cache — reused across warm invocations, re-fetched on
// cold start or expiry. Tokens last ~60 min; refresh a little early.
let _tok = { value: null, exp: 0 };

async function getToken(force) {
  if (!force && _tok.value && Date.now() < _tok.exp) return _tok.value;
  const r = await fetch(BASE + '/auth/v2/token', {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': SUBKEY(),
      'x-tenant-id': TENANT(),
      'Accept': 'application/json',
    },
  });
  if (!r.ok) throw Object.assign(new Error('auth ' + r.status), { status: r.status, body: await safeText(r) });
  const j = await r.json();
  const token = j.idToken || j.id_token || j.token;
  if (!token) throw new Error('auth response missing idToken');
  const ttlMs = (Number(j.expiresIn || j.expires_in) || 3600) * 1000;
  _tok = { value: token, exp: Date.now() + Math.max(60000, ttlMs - 120000) };
  return token;
}

async function safeText(r) { try { return await r.text(); } catch (_) { return ''; } }

// Curbit's exact envelope key varies; find the array of records wherever it is.
function pick(...vals) { for (const v of vals) { if (v != null) return v; } return undefined; }
function ordersArray(j) {
  if (Array.isArray(j)) return j;
  if (!j || typeof j !== 'object') return [];
  if (Array.isArray(j.data)) return j.data;
  if (Array.isArray(j.orders)) return j.orders;
  if (Array.isArray(j.results)) return j.results;
  if (Array.isArray(j.items)) return j.items;
  if (Array.isArray(j.stores)) return j.stores;
  if (j.data && Array.isArray(j.data.orders)) return j.data.orders;
  if (j.data && Array.isArray(j.data.items)) return j.data.items;
  return [];
}

// One authenticated GET, with a single automatic re-auth on 401.
async function curbitGet(pathAndQuery) {
  const doFetch = async (token) => fetch(BASE + pathAndQuery, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Ocp-Apim-Subscription-Key': SUBKEY(),
      'x-tenant-id': TENANT(),
      'Accept': 'application/json',
    },
  });
  let token = await getToken(false);
  let r = await doFetch(token);
  if (r.status === 401) { token = await getToken(true); r = await doFetch(token); }
  return r;
}

// Named exports so the cron (api/curbit-cron.js) can reuse the same auth
// without duplicating it. Each lambda gets its own module instance + token
// cache, which is fine.
export { curbitGet, getToken, safeText, ordersArray, pick, BASE as CURBIT_BASE };
export function curbitConfigured() { return !!(SUBKEY() && TENANT()); }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CURBIT_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // ?diag=1 → masked view of what's actually stored, so we can spot a swap,
  // wrong length, hidden whitespace or quotes WITHOUT exposing the secret.
  if ((req.query || {}).diag === '1') {
    const mask = (raw) => { if (raw == null) return null; const s = String(raw); return { len: s.length, head: s.slice(0, 4), tail: s.slice(-4), looksLikeGuid: /^[0-9a-f-]{36}$/i.test(s.trim()), hasWhitespace: /\s/.test(s), hasQuotes: /["']/.test(s) }; };
    res.status(200).json({ base: BASE, subscriptionKey: mask(process.env.CURBIT_SUBSCRIPTION_KEY), tenantId: mask(process.env.CURBIT_TENANT_ID), note: 'subscriptionKey should be len 32 / head c413 / tail 9149. tenantId should be looksLikeGuid:true.' });
    return;
  }

  const missing = [!SUBKEY() && 'CURBIT_SUBSCRIPTION_KEY', !TENANT() && 'CURBIT_TENANT_ID'].filter(Boolean);
  if (missing.length) {
    res.status(501).json({ error: 'Curbit API not configured', missingEnv: missing, hint: 'Set these as Vercel env vars, then redeploy.' });
    return;
  }

  const q = { ...(req.query || {}) };
  const resource = q.resource === 'stores' ? '/orders/v1/stores' : '/orders/v1';
  const wantAll = q.all === '1' || q.all === 'true';
  delete q.resource; delete q.all;

  const buildQS = (extra) => {
    const p = new URLSearchParams();
    Object.keys(q).forEach(k => { const v = q[k]; (Array.isArray(v) ? v : [v]).forEach(val => p.append(k, val)); });
    if (extra) Object.keys(extra).forEach(k => p.set(k, extra[k]));
    const s = p.toString();
    return s ? '?' + s : '';
  };

  try {
    // Stores, or a single orders page → pass-through, but normalize the array
    // onto `data` so the client sees one shape regardless of Curbit's key.
    if (resource === '/orders/v1/stores' || !wantAll) {
      const r = await curbitGet(resource + buildQS());
      const text = await safeText(r);
      let body; try { body = JSON.parse(text); } catch (_) { body = { raw: text }; }
      if (r.ok && body && typeof body === 'object' && !Array.isArray(body.data)) {
        const arr = ordersArray(body);
        if (arr.length || Array.isArray(body)) body = Object.assign({ data: arr }, Array.isArray(body) ? null : body);
      } else if (r.ok && Array.isArray(body)) {
        body = { data: body };
      }
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
      res.status(r.ok ? 200 : r.status).json(body);
      return;
    }

    // ?all=1 → auto-paginate orders. Repeat query mode + filters every page;
    // the cursor only carries position.
    const all = []; let cursor = null; let pages = 0; let total = null;
    do {
      const r = await curbitGet(resource + buildQS(cursor ? { cursor } : null));
      if (!r.ok) { res.status(r.status).json({ error: 'Curbit orders page failed', status: r.status, body: await safeText(r) }); return; }
      const j = await r.json();
      const arr = ordersArray(j);
      all.push(...arr);
      const pg = j.pagination || j.meta || j.page || {};
      if (total == null) total = pick(pg.total_count, pg.total, pg.count, j.total_count, j.total);
      cursor = pick(pg.next_cursor, pg.nextCursor, pg.cursor, pg.next, j.next_cursor) || null;
      pages += 1;
    } while (cursor && pages < MAX_PAGES);

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.status(200).json({ data: all, total_count: total, pages, capped: pages >= MAX_PAGES && !!cursor });
  } catch (err) {
    const status = err && err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    const out = { error: 'Curbit request failed', detail: String(err && err.message || err) };
    if (err && err.body) out.curbit = String(err.body).slice(0, 500); // surface Curbit's own message (e.g. "invalid subscription key")
    if (status === 401 || status === 403) out.hint = 'Curbit rejected the credentials. Re-check CURBIT_SUBSCRIPTION_KEY and CURBIT_TENANT_ID in Vercel (no stray spaces/quotes, not swapped), then redeploy.';
    res.status(status).json(out);
  }
}
