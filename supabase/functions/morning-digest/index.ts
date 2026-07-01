// supabase/functions/morning-digest/index.ts
// Sends the 7am "Yesterday" push to every opted-in device.
// Triggered by pg_cron (see PUSH-SETUP.md). Deploy with:
//   supabase functions deploy morning-digest
//
// Required secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY   — same key shipped in push-optin.js
//   VAPID_PRIVATE_KEY  — the matching private key (NEVER commit this)
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Public origin of the hub (used only as a fallback data source). Set this
// to your deployed hosting domain, e.g. https://neighborly-hub-53e4b.web.app
const HOSTING_ORIGIN = "https://neighborly-hub-53e4b.web.app";

const CONCEPT_LABELS: Record<string, string> = {
  whatsGabyCooking: "What's Gaby Cooking", miniKabob: "Mini Kabob", socialMonk: "Social Monk",
  mixtape: "Mixtape", palermoPizzaClub: "Palermo Pizza Club", neighborlyCookies: "Neighborly Cookies",
  marketplace: "Marketplace", catering: "Catering", beverages: "Beverages", wine: "Wine", beer: "Beer",
};

function money(n: number) {
  return n >= 1000 ? "$" + Math.round(n / 100) / 10 + "k" : "$" + Math.round(n);
}

// Build the one-line notification body from a daily-data payload.
function buildBody(daily: any): string {
  const T = daily?.total?.today || daily?.total || {};
  const pm: Record<string, number> = T.pmix || {};
  const ranked = Object.keys(pm).sort((a, b) => pm[b] - pm[a]);
  const top = ranked[0] ? (CONCEPT_LABELS[ranked[0]] || ranked[0]) : null;
  const second = ranked[1] ? (CONCEPT_LABELS[ranked[1]] || ranked[1]) : null;
  const parts: string[] = [];
  if (T.netSales) parts.push(`${money(T.netSales)} net`);
  if (top) parts.push(`Top: ${top}`);
  if (second) parts.push(`#2 ${second}`);
  return parts.join(" · ") || "Your daily recap is ready.";
}

// Freshest source = the dashboard-daily function; fall back to the public snapshot.
async function getDaily(supabase: any): Promise<any | null> {
  try {
    const { data, error } = await supabase.functions.invoke("dashboard-daily", { body: {} });
    if (!error && data) return data;
  } catch (_) { /* fall through */ }
  try {
    return await fetch(`${HOSTING_ORIGIN}/daily-data.json`).then((r) => r.json());
  } catch (_) { return null; }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  webpush.setVapidDetails(
    "mailto:kallmeroth@beneighborly.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const daily = await getDaily(supabase);
  const payload = JSON.stringify({
    title: "Neighborly — Yesterday",
    body: buildBody(daily),
    url: "/neighborly-digest.html",
    tag: "morning-digest",
  });

  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0, pruned = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (err: any) {
      // 404/410 = subscription expired → clean it up so the table stays tidy.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        pruned++;
      } else {
        console.error("push failed", err?.statusCode, err?.body);
      }
    }
  }
  return new Response(JSON.stringify({ sent, pruned }), { headers: { "Content-Type": "application/json" } });
});
