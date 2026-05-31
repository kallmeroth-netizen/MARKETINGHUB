# Neighborly Operations Hub — Data Map (for COO)

**Status:** Wireframe / mockup. All numbers in the Ops pages are **sample data**.
This document is the hand-off: it lists every metric, the page it lives on, and
the **source + field** to wire in. Marketing pages are **unchanged**.

> Reminder (per the planning summary): the long operational list is **not 12
> dashboards** — it's **~2 dashboards with filters**. "Day→Year", "FOH/Kitchen/Total"
> and "by job" are **filter controls**, not separate pages.

---

## Access — the third door

`index.html` front door now routes **three** passcodes (cosmetic gate only —
not real security; anything sensitive needs server-side auth):

| Passcode | Side | Lands on |
|----------|------|----------|
| `neighborly` | Team (admin) | Marketing hub (full nav) — unchanged |
| `neighborsonly` | Guest | Marketing hub (limited nav) — unchanged |
| `neighborlyops` *(placeholder)* | **Ops** | **Operations Hub tiles** |

➡️ **Change the Ops passcode** in `index.html`: the single constant `OPS_PW`.

The Operations Hub is the same front door showing its own face (ops tiles +
"Neighborly Operations Hub" label). Each Ops page also has its own hub-navigator
dropdown linking the Ops pages + Home.

---

## Portal 1 · Marketing Hub (live — DO NOT CHANGE)
`neighborly-dashboard.html` · `neighborly-calendar.html` · `neighborly-guests.html`
· `neighborly-social.html` (coming soon) · `neighborly-assets.html` (Brand)
· `neighborly-pmix.html` (Sales & Pmix)

---

## Portal 2 · Operations Hub (new — wireframe)

### 1. Sales & Forecasting — `neighborly-sales.html`
Filters: **Timeframe** (Day/Week/Period/Quarter/Year) · **Segment** (Total/Restaurant/Catering) · **Comp view** (Item/Daypart/Day)

| Metric / card | Source to wire |
|---------------|----------------|
| Net Sales (actual) | POS net sales by business day |
| Net Sales (forecast) | Forecast model (prior-year + trend) |
| Average Check | POS: net sales ÷ check count |
| Catering Mix % | POS revenue center: catering ÷ total |
| Comps $ / % | POS comp/void log |
| Forecast vs. Actual chart | POS net sales vs. forecast feed |
| Comps breakdown chart | POS comp/void log grouped by item / daypart / day |

### 2. Labor & SPLH — `neighborly-labor.html`
Filters: **Timeframe** (Day→Year) · **Department** (Total/FOH/Kitchen) · **By Job** (server/host/bar/line/prep/dish/manager)

| Metric / card | Source to wire |
|---------------|----------------|
| SPLH (actual) | POS net sales ÷ payroll hours |
| SPLH (forecast) | Labor model forecast |
| Labor % | Payroll cost ÷ POS net sales |
| Hours — actual | Time-clock (worked hours) |
| Hours — forecast | Labor forecast / schedule |
| OT Hours / OT % | Payroll: hours over 40/wk |
| Hours before open / after close | Time-clock vs. published open/close times |

### 3. Product Mix · Ops — `neighborly-pmixops.html`
**The one true overlap.** Computed **once here** (where POS data lives); the
Marketing "Sales & Pmix" page **links** to this — never duplicated.
Filters: **Timeframe** (Day/Week/Period)

| Metric / card | Source to wire |
|---------------|----------------|
| Items Sold | POS line-item units |
| Category Mix | POS line items → menu category map |
| Top Items by Contribution | POS item sales × recipe/margin file |
| Avg Items / Check, Attach Rate | POS check composition |

---

## Open decisions (from planning summary)
1. **PMIX final home** — built in Ops as the source of truth, linked from Marketing. *(Confirm.)*
2. **Brand** — `neighborly-assets.html` is live as "Brand Assets". Rename to `neighborly-brand.html` or keep? *(Confirm.)*
3. Shared infra still per-device (localStorage) — calendar sync, .ics feed, EmailJS unaffected by this work.

## Files added in this branch
- `neighborly-sales.html`, `neighborly-labor.html`, `neighborly-pmixops.html` — Ops dashboards (wireframe)
- `index.html` — third passcode door + ops tiles (Team/Guest untouched)
- `backups/2026-05-30/` — snapshot of all live HTML before changes
- `neighborly-ops-datamap.md` — this file
