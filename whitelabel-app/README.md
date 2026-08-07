# Marketing Hub — White-Label Edition

A brand-agnostic, self-serve version of the marketing-intelligence portal. A new
customer signs up, walks through a **step-by-step setup wizard** (create account →
brand name → logo → colors → connect data → done), and their identity drops into
the exact same placements the reference product uses — same nav, same hub, same
dashboards. No customer numbers ship in this package; branding ships as neutral
placeholders.

The **base look is Apple-inspired**: the SF Pro system font, a clean flat
light-gray (`#f5f5f7`) canvas, near-black ink, hairline borders, soft understated
shadows, large rounded corners, and Apple blue (`#0071e3`) as the default accent.
Brands recolor everything in the wizard; the Apple-clean structure stays.

> This folder is **self-contained** and carries **no** source-brand data, keys,
> logos, or figures. It is built to be lifted straight into its own repository —
> see [Moving to its own repo](#moving-to-its-own-repo).

---

## How the white-label engine works

Branding is applied **at runtime** from a single config, so one source of truth
rebrands every page — you never hand-edit pages to add a customer.

| File | Role |
|------|------|
| `brand.default.js` | The neutral factory default (name, placeholder logo, neutral palette, empty backend/API slots). |
| `brand-config.js`  | Loads/saves the active config in `localStorage` (`window.Brand` API), deep-merged over the defaults. |
| `brand-apply.js`   | Included on **every** page. Injects the palette over the theme tokens, swaps the logo, replaces `{{BRAND}}` / `{{TAGLINE}}` and `[data-brand-*]` elements, sets favicon + title. Re-runs on the `brand:changed` event so wizard edits show instantly. |
| `theme.css`        | The design system. `brand-apply.js` overrides its `:root` tokens — the CSS itself is never edited per brand. |

**To brand a page**, include the three scripts in the `<head>` and use the hooks:

```html
<script src="brand.default.js"></script>
<script src="brand-config.js"></script>
<script src="brand-apply.js" defer></script>
```

- Logo: `<img data-brand-logo src="assets/placeholder-logo.svg" alt="Brand">`
- Name / tagline: `{{BRAND}}`, `{{TAGLINE}}`, or `<span data-brand-name></span>` / `[data-brand-tagline]`
- Colors: use the theme tokens (`var(--brand-orange)` = primary action color, `var(--ink)`, `var(--bg)`, `var(--brand-green)` …). They are overridden live from `colors` in the config.

## Pages

| Page | What it is |
|------|-----------|
| `setup.html` | **The setup wizard.** 6 steps, live preview, saves to `localStorage`. Re-runnable anytime from Admin. |
| `index.html` | Sign-in + hub. First visit with no completed setup redirects to `setup.html`. |
| `admin.html` | User management (invite/edit/delete), connected-source status, and a **Branding & setup** card that re-launches the wizard. |
| `dashboard.html` | Performance Marketing — **empty-state** KPIs, same layout, "connect a source" until a backend is wired. |
| `pmix.html` | Sales & Pmix — empty-state KPIs + product-mix skeleton. |
| `calendar.html` | Marketing Calendar — category filter chips, **Add to Google Calendar** + **Export .ics**, live month grid; empty until campaigns/backend are added. |
| `influencer.html` | Influencer — creators, seeding & collabs; empty KPIs + roster table. |
| `themes.html` | Themes — monthly marketing themes (12-month grid, current month highlighted). |
| `gantt.html` | Gantt — timeline & rollout skeleton. |
| `assets.html` | Brand Assets — surfaces your brand logo as the first asset; upload/templates land here once storage is connected. |
| `coming-soon.html` | Generic branded placeholder kept for any future module before it ships. |

Every module page is a real **empty state** — the layout and placements match the
live product exactly; only the numbers are absent until a source is connected.

## Running locally

Static files — serve the folder over HTTP (needed for `fetch` + modules):

```bash
cd whitelabel-app
python3 -m http.server 8080
# open http://localhost:8080
```

First load → the wizard. Finish it → the hub shows your logo, name and colors in
the same spots the reference brand's occupied. Everything persists in
`localStorage` on that browser.

## Connecting a backend (per customer)

Each customer uses **their own Supabase project**, entered in wizard Step 1, so
their data never mixes with anyone else's. To finish the backend they need:

1. A `users` table (`id uuid pk`, `email text`, `role text`, `full_name text`,
   `created_at timestamptz`) with row-level security.
2. Role delivered on the JWT via a **custom access-token hook** (sets
   `app_metadata.role`); `np-data.js` falls back to a `users` row lookup until
   the hook is registered.
3. Two Edge Functions for admin user management: `invite-user` and `manage-user`
   (service-role key stays server-side, never shipped to the browser).

Until a backend is connected, the app runs in a fully brandable **preview mode**:
branding, the wizard, and empty-state pages all work; user management shows a
"connect your backend" notice.

> No Supabase URL or key is committed here. Anon keys are public-by-design and
> live only in the customer's own `localStorage` config.

## No-API option — Google Sheets automation

Brands without APIs can drive the hub from a **published Google Sheet** instead:

1. In the sheet: **File → Share → Publish to web → pick the tab → CSV → Publish.**
2. Paste that CSV link into the wizard's **Data** step, under *"No API? Use a
   Google Sheet,"* and click **Test connection**.
3. The wizard fetches the link and reports **✓ Connected — N rows × M columns**
   (or a specific error if the link isn't a published CSV). That live test is how
   we make sure it works before the brand relies on it.

The sheet becomes the automation surface: update it by hand, or automate it with
Apps Script / Zapier / Make — the hub always reads the latest CSV. The URL +
status persist to `brand.sheetSource`; `dashboard.html` reads the sheet on load
and shows the synced row count (column→KPI mapping is wired once the brand's
sheet layout is known). Only a *published* sheet works cross-origin — a normal
"share" link returns a web page, and the Test call flags exactly that.

## Data — wiped by design

`data/*.json` are **empty scaffolds** (valid shape, zero rows). Dashboards render
honest empty states instead of anyone's real figures. Real numbers come only from
a connected backend, per customer.

## Moving to its own repo

```bash
cp -r whitelabel-app my-marketing-hub && cd my-marketing-hub
git init && git add -A && git commit -m "White-label Marketing Hub"
# add a remote and push
```

Nothing outside this folder is required.

## Roadmap (next modules to port)

The hub ships with these modules: Performance Marketing, Sales & Pmix, Marketing
Calendar, Brand Assets, and Admin. (Labor & SPLH and Guest Intelligence were
intentionally removed from this white-label edition.) Each remaining module ports
the same way: copy the layout, include the three brand scripts, replace hard-coded
brand text with `{{BRAND}}` tokens, and point data reads at the empty
`data/*.json` scaffolds (or the connected backend). `coming-soon.html` holds a
module's place in the hub until it lands.

### Configurable tabs

The hub's tabs are a **single catalog** (`hub-modules.js`) consumed by the hub,
the shared nav, and the wizard's **"Choose your tabs"** step. Each brand:
- toggles built-in modules on/off (Performance, Sales & Pmix, Calendar,
  Influencer, Themes, Gantt, Brand Assets),
- adds their **own custom tabs** (any label + link, opens in a new tab),
- and sees a **"Coming soon"** list of modules still to ship.

Selections persist to `brand.modules` + `brand.customTabs`; the hub and nav
render only what's enabled, in catalog order (Home first, Admin last for admins).

### Brand controls

The wizard/config also drives: a **sign-in greeting** (`greeting`, typed out on
the login screen — the "opening line"), a **branded sweep transition** on sign-in
(a primary-colored panel that sweeps up to reveal the hub), a time-aware hub
greeting (Good morning/afternoon/evening), and a **monogram favicon** (the brand's
first initial in the primary color — no emoji) generated until a logo is uploaded.

## IP / productization note

This white-label layer — a runtime brand-config engine plus a guided setup wizard
that re-skins an entire multi-page analytics app from one config — is the
sellable, potentially patentable core. It is deliberately isolated from the
reference brand's assets and data so it can stand alone as a product.
