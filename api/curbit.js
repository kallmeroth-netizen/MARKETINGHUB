// api/curbit.js — Vercel Serverless Function
// Secure server-side proxy for the Curbit Orders Data API.
//
// WHY THIS EXISTS
// The Curbit API key is an Azure API Management subscription key. It must NEVER
// be exposed to the browser (anyone could read it in "View Source"). So the key
// lives ONLY as a Vercel environment variable and every call to Curbit happens
// here, on the server. The hub page calls THIS endpoint, never Curbit directly.
//
// REQUIRED VERCEL ENVIRONMENT VARIABLES (set in Vercel → Project → Settings →
// Environment Variables — do NOT commit real values to the repo):
//   CURBIT_API_BASE          e.g. https://<host>.azure-api.net   (base URL from the docs)
//   CURBIT_ORDERS_PATH       e.g. /orders                        (endpoint path; default below)
//   CURBIT_SUBSCRIPTION_KEY  the Ocp-Apim-Subscription-Key value
//   CURBIT_TENANT_ID         the x-tenant-id value
// Optional:
//   CURBIT_ALLOW_ORIGIN      CORS origin allowlist (default '*')
//
// USAGE
//   GET /api/curbit?from=2026-08-01&to=2026-08-20&limit=200
// Any query params are forwarded to Curbit unchanged, so date filters /
// pagination pass straight through once we confirm their exact names in the
// docs. Returns Curbit's JSON verbatim for now (so we can see the real shape);
// normalization + a Firebase snapshot for the dashboard get added once the
// response schema is confirmed.
//
// TODO (pending the Orders API Consumer Guide):
//   1. Confirm CURBIT_API_BASE + CURBIT_ORDERS_PATH and the exact query params.
//   2. Map the response fields → { platform, date, grossSales, orders, sponsoredSpend, promoSpend }.
//   3. Persist a normalized weekly snapshot to Firebase (marketing 3PD) so the
//      dashboard's Uber Eats + DoorDash tiles read it, and add a Vercel Cron
//      to refresh continuously.

const ORDERS_PATH_DEFAULT = '/orders';

export default async function handler(req, res) {
  const origin = process.env.CURBIT_ALLOW_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const base   = process.env.CURBIT_API_BASE;
  const key    = process.env.CURBIT_SUBSCRIPTION_KEY;
  const tenant = process.env.CURBIT_TENANT_ID;
  const path   = process.env.CURBIT_ORDERS_PATH || ORDERS_PATH_DEFAULT;

  // Fail loudly-but-safely if the secrets aren't configured yet — never leak
  // which value is missing beyond its env-var name.
  const missing = [
    !base   && 'CURBIT_API_BASE',
    !key    && 'CURBIT_SUBSCRIPTION_KEY',
    !tenant && 'CURBIT_TENANT_ID',
  ].filter(Boolean);
  if (missing.length) {
    res.status(501).json({
      error: 'Curbit API not configured',
      missingEnv: missing,
      hint: 'Set these as Vercel environment variables, then redeploy.',
    });
    return;
  }

  // Build the upstream URL, forwarding the caller's query params unchanged.
  let upstream;
  try {
    upstream = new URL(path.replace(/^\/?/, '/'), base.replace(/\/?$/, ''));
  } catch (e) {
    res.status(500).json({ error: 'Bad CURBIT_API_BASE / CURBIT_ORDERS_PATH' });
    return;
  }
  const forwarded = req.query || {};
  Object.keys(forwarded).forEach(k => {
    const v = forwarded[k];
    (Array.isArray(v) ? v : [v]).forEach(val => upstream.searchParams.append(k, val));
  });

  try {
    const r = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'x-tenant-id': tenant,
        'Accept': 'application/json',
      },
    });

    const text = await r.text();
    // Cache at the edge briefly so the page + cron don't hammer the API.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    // Pass through Curbit's status + JSON (or raw text if it isn't JSON).
    let body;
    try { body = JSON.parse(text); } catch (_) { body = { raw: text }; }
    res.status(r.ok ? 200 : r.status).json(body);
  } catch (err) {
    res.status(502).json({ error: 'Curbit request failed', detail: String(err && err.message || err) });
  }
}
