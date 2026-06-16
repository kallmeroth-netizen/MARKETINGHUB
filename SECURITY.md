# Security notes

## Firebase Web API key in the repo

You will see the Firebase Web API key `AIzaSy…CQpw` hardcoded in
several HTML files. **This is intentional and is not a leaked secret.**

GitHub's secret-scanner flags it (see alert `/security/secret-scanning/1`)
because the string matches the Google API key pattern, but per
[Firebase's own docs](https://firebase.google.com/docs/projects/api-keys),
Web API keys are **public identifiers, not secrets**. They identify the
Firebase project so the SDK knows which project to talk to. The actual
access control for the Realtime Database is:

1. **`database.rules.json`** in this repo. Root reads and writes are
   denied; only `marketplace-npi` and `marketing-calendar` branches are
   open to anonymous browsers.
2. **HTTP referrer restrictions** on the API key itself (configured in
   the [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   page for the `neighborly-hub-53e4b` project). Only the production
   hostnames are allowlisted, so even if the key were copied, it can't
   be used from arbitrary origins.
3. **Firebase App Check** (optional, not currently enabled). If we ever
   need stronger per-request attestation we can add this without
   changing the embedded key.

### How to handle the GitHub alert

Go to <https://github.com/kallmeroth-netizen/MARKETINGHUB/security/secret-scanning/1>,
click **Close as → Used in tests → "Public Firebase Web API key; access
gated by DB rules per Firebase docs"**, and submit. The alert won't
re-open unless a NEW key appears in the repo.

### If you ever need to rotate the key

1. In [Firebase Console → Project settings → General](https://console.firebase.google.com/project/neighborly-hub-53e4b/settings/general),
   generate a new Web app config or click the existing one's "regenerate"
   button.
2. Copy the new `apiKey` value.
3. Open `firebase-config.js` in this repo and replace the `apiKey`
   string. Every page that imports the config picks up the new value
   automatically — there are no inline copies anywhere else.

## Other secrets

- **Supabase anon key** in `np-data.js` — same public-by-design pattern
  as Firebase. Row-Level Security in Supabase is the actual access
  control. Do not commit the `service_role` key.
- **EmailJS public key** in `neighborly-marketplace.html` — public per
  EmailJS docs; their throttling + template allowlist is the gate.
