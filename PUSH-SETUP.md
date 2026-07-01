# Morning Digest — Push Notification Setup (for Peter)

The frontend is done and in the repo: the digest page (`neighborly-digest.html`),
the push service worker (`push-sw.js`), and the opt-in toggle (`push-optin.js`,
already wired into the dashboard header). This doc is the ~20-minute Supabase
side that makes the 7am push actually fire.

**Order matters:** do steps 1–2 and people can already opt in. Steps 3–5 turn on
the daily send.

---

## 1. Create the subscriptions table

Run in the Supabase SQL editor:

```sql
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  tz         text default 'America/Los_Angeles',
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

-- Each signed-in person can only see/change their own device rows.
create policy "own subs select" on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);
create policy "own subs insert" on public.push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own subs update" on public.push_subscriptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own subs delete" on public.push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);
```

✅ After this, the **"Morning updates" toggle already works** — people can opt in
and rows will appear here. (Nothing sends yet.)

---

## 2. Set the VAPID secrets

The **public** key is already in `push-optin.js`. You need the **private** key
(Claude will give it to you in chat — it is deliberately NOT committed to the repo).

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="BDidj2swOHs33H886WSu8VLixQK3gnwboiauVK8lQvbEhmKnYtAviEu2z0yUCIqqTVrG8uECHuLKxu7xVAEFt5w" \
  VAPID_PRIVATE_KEY="<paste the private key from chat>"
```

> If you'd rather generate your own keypair, run `npx web-push generate-vapid-keys`,
> set both secrets from it, and paste the **public** value into `VAPID_PUBLIC_KEY`
> at the top of `push-optin.js` (they must match).

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — no action.

---

## 3. Deploy the sender function

```bash
supabase functions deploy morning-digest
```

Then confirm the data source: open `supabase/functions/morning-digest/index.ts`
and check `HOSTING_ORIGIN` points at the live hub domain (currently
`https://neighborly-hub-53e4b.web.app`). The function first tries the
`dashboard-daily` function for fresh numbers and falls back to that URL's
`/daily-data.json`.

Smoke-test it:
```bash
curl -X POST "https://<PROJECT-REF>.functions.supabase.co/morning-digest" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
# -> {"sent":N,"pruned":0}
```

---

## 4. Schedule it for 7am (LA)

Enable `pg_cron` + `pg_net` (Database → Extensions), then:

```sql
select cron.schedule(
  'morning-digest',
  '0 14 * * *',   -- 14:00 UTC = 7:00am PDT (summer). Use '0 15 * * *' for PST (winter).
  $$
  select net.http_post(
    url     := 'https://<PROJECT-REF>.functions.supabase.co/morning-digest',
    headers := jsonb_build_object(
                 'Content-Type','application/json',
                 'Authorization','Bearer <SERVICE_ROLE_KEY>'),
    body    := '{}'::jsonb
  );
  $$
);
```

> DST note: pg_cron runs in UTC, so the 7am wall-clock time shifts by an hour
> twice a year. Simplest fix: keep `0 14 * * *` and accept 8am in winter, or
> flip the hour at each DST change. (A per-user-timezone send is possible later
> using the `tz` column, but a single fixed time is the clean v1.)

---

## 5. Test the whole loop
1. Open the hub, tap **Morning updates**, Allow. (iPhone: **Add to Home Screen first**, then open from there.)
2. Run the `curl` from step 3 — you should get the push within seconds.
3. Tap it → the digest popup opens.

---

## Notes
- **iPhone requirement:** web push only works when the hub is installed to the
  Home Screen (iOS 16.4+). The toggle detects Safari-tab-on-iPhone and shows the
  "Add to Home Screen" instruction instead of a dead button.
- **Security:** the private VAPID key lives only as a Supabase secret; the repo
  only contains the public key (safe by design). RLS ensures each person can only
  touch their own subscription rows.
- **Unsubscribes** are pruned automatically when a push comes back 404/410.
