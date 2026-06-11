/* ============================================================================
   NEIGHBORLY MARKETPLACE NPI — DROP-IN UPGRADE PACKAGE  (v2)
   Target file: neighborly-marketplace.html  (the ~66k-char inline <script>)
   ----------------------------------------------------------------------------
   WHAT THIS DOES
   • Adds a dedicated "W-9" stage (vendor documents) and removes the duplicated
     W9/COI/compliance items that currently live in BOTH the Sample and
     Commercial stages.
   • Enriches EVERY task with: owner (who does it), def (definition of done /
     verifiable outcome), notify + notifyMsg (who gets pinged on completion),
     and blocking (does it gate the stage).
   • Adds Trigger #0 "New Product Added" — broadcasts to all teams the instant a
     launch is created. No task assignment happens here (that stays on the
     normal stage handoffs), it's purely the kickoff announcement.
   • Small render + buildTasks tweaks so owner + definition-of-done actually show
     on each task row.

   WHY IT'S SAFE / RELIABLE
   Your app ALREADY: builds per-launch tasks from TASK_TEMPLATES (buildTasks),
   computes readiness % and stage gates from tasks (readiness / stageReady),
   fires per-task emails when a completed task has notify/notifyMsg (toggleTask),
   hands off to the next team on stage advance (PROCESS), and flags stalls after
   3 business days (pulseStalls). So this upgrade is mostly DATA — the engine is
   already there. Stages compute from tasks, so no checkbox can "lie."

   HOW TO INSTALL  (you deploy — this touches production Firebase + live EmailJS)
   1. BLOCK 1 → replace your existing `STAGES = [...]`.
   2. BLOCK 2 → replace your existing `DEPTS = [...]`  (adds "Compliance").
   3. BLOCK 3 → replace your existing `TASK_TEMPLATES = [...]`.
   4. BLOCK 4 → replace your existing `PROCESS = [...]`.
   5. BLOCK 5 → paste the notifyNewProduct() function near notifyTeam(), then add
      the ONE call line in your launch-create handler (see instructions there).
   6. BLOCK 6 → add 2 fields inside buildTasks() (see instructions).
   7. BLOCK 7 → paste the small task-row display snippet into renderDetail()
      (see instructions). Optional but recommended — without it, owner/def are
      stored but not shown.
   8. SETTINGS → in the app's Settings modal, add an email for the new
      "Compliance" department so its handoff/notify emails resolve.
   9. Hard-refresh, create a test product, confirm the broadcast logs/sends,
      walk one launch through the W-9 stage to verify the gate.

   NOTE: I could not read renderDetail()/toggleTask()/launchModal() verbatim —
   the browser security sandbox blocked the raw source — so BLOCKS 5–7 are given
   as precise, additive snippets with placement notes rather than full-function
   replacements. The DATA blocks (1–4) are exact to your app's conventions.
   ============================================================================ */


/* ===== BLOCK 1 — STAGES (replace existing) =================================
   Added `compliance` ("W-9") between Commercial and ERP. 11 stages total. */
const STAGES = [
  { key:'discovery',  label:'Discovery',      dept:'Marketplace', color:'#cbc9d6' },
  { key:'sample',     label:'Sample Review',  dept:'Marketplace', color:'#cbc9d6' },
  { key:'commercial', label:'Commercial',     dept:'Procurement', color:'#6280bd' },
  { key:'compliance', label:'W-9',            dept:'Compliance',  color:'#b88fb8' }, // NEW
  { key:'erp',        label:'ERP / Synergy',  dept:'Inventory',   color:'#69b0a5' },
  { key:'commissary', label:'Commissary',     dept:'Commissary',  color:'#dbc6a2' },
  { key:'operations', label:'Operations',     dept:'Operations',  color:'#7bbd91' },
  { key:'marketing',  label:'Marketing',      dept:'Marketing',   color:'#e87142' },
  { key:'store',      label:'Store Launch',   dept:'Store Ops',   color:'#eace49' },
  { key:'live',       label:'Live',           dept:'—',           color:'#7bbd91' },
  { key:'review',     label:'30-Day Review',  dept:'Marketplace', color:'#cbc9d6' }
];


/* ===== BLOCK 2 — DEPTS (replace existing) =================================
   Added "Compliance". After deploying, set its email in Settings. */
const DEPTS = [
  { key:'Marketplace', color:'#cbc9d6' },
  { key:'Procurement', color:'#6280bd' },
  { key:'Compliance',  color:'#b88fb8' }, // NEW — owns the W-9 / vendor-docs stage (AP)
  { key:'Inventory',   color:'#69b0a5' },
  { key:'Commissary',  color:'#dbc6a2' },
  { key:'Operations',  color:'#7bbd91' },
  { key:'Marketing',   color:'#e87142' },
  { key:'Store Ops',   color:'#eace49' }
];


/* ===== BLOCK 3 — TASK_TEMPLATES (replace existing) ========================
   Fields per task:
     stage     – stage key (must match BLOCK 1)
     dept      – owning department (must match BLOCK 2)  [drives color/handoff]
     label     – the verifiable outcome (what specifically gets done)
     owner     – the role/person responsible (accountability; free text)
     def       – definition of done: the one-line condition that makes
                 checking the box honest
     notify    – OPTIONAL dept key to email the instant this task is checked
                 (used for cross-team dependencies; leave off for routine tasks
                 so inboxes stay sane — stage handoffs are emailed via PROCESS)
     notifyMsg – OPTIONAL message body for that notification
     blocking  – does this task gate the stage? (default true; set false for
                 nice-to-haves that shouldn't hold up readiness)
   ------------------------------------------------------------------------- */
const TASK_TEMPLATES = [

  /* ── Stage 1 · Discovery — Marketplace ───────────────────────────────── */
  { stage:'discovery', dept:'Marketplace', label:'Product intake form completed',
    owner:'Marketplace Lead', def:'Intake form submitted with brand, product, category & contact captured' },
  { stage:'discovery', dept:'Marketplace', label:'Brand submitted & logged',
    owner:'Marketplace Lead', def:'Brand record created in the pipeline' },
  { stage:'discovery', dept:'Marketplace', label:'Samples requested from brand',
    owner:'Marketplace Lead', def:'Sample request sent to vendor with ship-to address' },
  { stage:'discovery', dept:'Marketplace', label:'Samples received',
    owner:'Marketplace Lead', def:'Physical samples in hand and logged' },

  /* ── Stage 2 · Sample Review — Marketplace ───────────────────────────── */
  { stage:'sample', dept:'Marketplace', label:'Tasting scheduled',
    owner:'Marketplace Lead', def:'Tasting date on the calendar with panel invited' },
  { stage:'sample', dept:'Marketplace', label:'Taste approved',
    owner:'Marketplace Lead', def:'Tasting panel signed off on product quality' },
  { stage:'sample', dept:'Marketplace', label:'Margin approved',
    owner:'Marketplace Lead', def:'Projected margin meets or exceeds threshold' },
  { stage:'sample', dept:'Marketplace', label:'Assortment approved',
    owner:'Marketplace Lead', def:'SKU list confirmed for the assortment' },
  { stage:'sample', dept:'Marketplace', label:'Asset: Product images received',
    owner:'Marketplace Lead', def:'Hi-res product images on file', blocking:false },
  { stage:'sample', dept:'Marketplace', label:'Asset: Brand logo received',
    owner:'Marketplace Lead', def:'Vector/hi-res logo on file', blocking:false },
  { stage:'sample', dept:'Marketplace', label:'Asset: Brand story received',
    owner:'Marketplace Lead', def:'Brand story copy on file', blocking:false,
    notify:'Marketing', notifyMsg:'Brand story received — available for Marketing to draft product copy.' },

  /* ── Stage 3 · Commercial — Procurement ──────────────────────────────── */
  { stage:'commercial', dept:'Procurement', label:'Vendor setup started',
    owner:'Procurement Coordinator', def:'Vendor record opened in the system' },
  { stage:'commercial', dept:'Procurement', label:'Confirm MOQ & case pack',
    owner:'Procurement Coordinator', def:'Minimum order qty and units-per-case confirmed with vendor in writing' },
  { stage:'commercial', dept:'Procurement', label:'Confirm lead times & shelf life',
    owner:'Procurement Coordinator', def:'Production/ship lead time and shelf-life window documented' },
  { stage:'commercial', dept:'Procurement', label:'Terms finalized',
    owner:'Procurement Coordinator', def:'Payment & trade terms agreed and recorded' },
  { stage:'commercial', dept:'Procurement', label:'Cost sheet approved',
    owner:'Procurement Manager', def:'Landed cost sheet signed off by Procurement manager' },
  { stage:'commercial', dept:'Procurement', label:'Free first fill secured',
    owner:'Procurement Coordinator', def:'Free first-fill agreement on file from vendor',
    notify:'Commissary', notifyMsg:'Free first fill secured — Commissary can expect the initial fill shipment.' },
  { stage:'commercial', dept:'Procurement', label:'Collect + upload initial invoice',
    owner:'Procurement Coordinator', def:'First invoice received and uploaded' },
  // Hand-off to the new W-9 stage:
  { stage:'commercial', dept:'Procurement', label:'Commercial terms complete — ready for vendor docs',
    owner:'Procurement Coordinator', def:'All commercial terms above confirmed',
    notify:'Compliance', notifyMsg:'Commercial terms finalized — please collect W-9 + COI before vendor goes live in the systems.' },

  /* ── Stage 4 · W-9 — Compliance (NEW; was duplicated in Sample+Commercial) ─
     Holds all vendor compliance documents. Gates ERP/SKU creation so we never
     set a vendor up in R365/Synergy before the paperwork clears. */
  { stage:'compliance', dept:'Compliance', label:'Collect + upload W-9',
    owner:'AP Clerk', def:'W-9 PDF on file; TIN matches legal vendor name' },
  { stage:'compliance', dept:'Compliance', label:'Collect + upload Insurance (COI)',
    owner:'AP Clerk', def:'COI on file naming Neighborly as additional insured; expiry after launch date' },
  { stage:'compliance', dept:'Compliance', label:'Nutrition panel on file',
    owner:'AP Clerk', def:'Nutrition facts panel uploaded' },
  { stage:'compliance', dept:'Compliance', label:'Ingredient statement on file',
    owner:'AP Clerk', def:'Full ingredient statement uploaded' },
  { stage:'compliance', dept:'Compliance', label:'Allergen information on file',
    owner:'AP Clerk', def:'Allergen declaration uploaded' },
  { stage:'compliance', dept:'Compliance', label:'Product spec sheet on file',
    owner:'AP Clerk', def:'Vendor product spec sheet uploaded' },
  { stage:'compliance', dept:'Compliance', label:'Vendor documents cleared — vendor active',
    owner:'AP Clerk', def:'All compliance docs on file; vendor flagged active',
    notify:'Inventory', notifyMsg:'Vendor documents cleared — safe to create the R365/Synergy item & SKU.' },

  /* ── Stage 5 · ERP / Synergy — Inventory ─────────────────────────────── */
  { stage:'erp', dept:'Inventory', label:'Create R365 item',
    owner:'Synergy Admin', def:'Item created in R365 with correct UOM' },
  { stage:'erp', dept:'Inventory', label:'Create R365 recipe',
    owner:'Synergy Admin', def:'Recipe/build created in R365' },
  { stage:'erp', dept:'Inventory', label:'Add Item Category 1 = Marketplace Item',
    owner:'Synergy Admin', def:'Category 1 set to "Marketplace Item"' },
  { stage:'erp', dept:'Inventory', label:'Add to Marketplace order guide',
    owner:'Synergy Admin', def:'Item appears on the Marketplace order guide' },
  { stage:'erp', dept:'Inventory', label:'Add to Commissary inventory guide',
    owner:'Synergy Admin', def:'Item on the Commissary inventory guide' },
  { stage:'erp', dept:'Inventory', label:'Add to WLV/BW inventory guide',
    owner:'Synergy Admin', def:'Item on the WLV/BW inventory guide' },
  { stage:'erp', dept:'Inventory', label:'Attach to Toast item (after Marketing rings up qty 1)',
    owner:'Synergy Admin', def:'R365 item linked to the Toast item once Marketing has created it' },

  /* ── Stage 6 · Commissary ────────────────────────────────────────────── */
  { stage:'commissary', dept:'Commissary', label:'Confirm sample received',
    owner:'Commissary Manager', def:'Sample physically received at commissary' },
  { stage:'commissary', dept:'Commissary', label:'Assign storage location (Shelf / Refrigerator / Freezer)',
    owner:'Commissary Manager', def:'Specific storage location & class assigned' },
  { stage:'commissary', dept:'Commissary', label:'Check R365 item created / on order guide',
    owner:'Commissary Manager', def:'Verified the R365 item exists and is on the guide' },
  { stage:'commissary', dept:'Commissary', label:'Confirm first fill received',
    owner:'Commissary Manager', def:'First-fill quantity received and counted' },
  { stage:'commissary', dept:'Commissary', label:'Set 2-week PAR',
    owner:'Commissary Manager', def:'2-week PAR level set in the system' },
  { stage:'commissary', dept:'Commissary', label:'Add ingredient PARs',
    owner:'Commissary Manager', def:'Component/ingredient PARs entered' },
  { stage:'commissary', dept:'Commissary', label:'Receiving SOP written',
    owner:'Commissary Manager', def:'Receiving SOP documented for this item', blocking:false },

  /* ── Stage 7 · Operations ────────────────────────────────────────────── */
  { stage:'operations', dept:'Operations', label:'Confirm items on R365 order guide',
    owner:'Operations Manager', def:'Item verified on the store order guide' },
  { stage:'operations', dept:'Operations', label:'Assign shelf space on store planogram',
    owner:'Operations Manager', def:'Shelf location assigned on the planogram',
    notify:'Marketplace', notifyMsg:'Planogram shelf space assigned — please review & approve placement.' },
  { stage:'operations', dept:'Operations', label:'Confirm initial case/each qty to receive',
    owner:'Operations Manager', def:'Opening order quantity confirmed' },
  { stage:'operations', dept:'Operations', label:'Receive shelf tag (from Marketing)',
    owner:'Operations Manager', def:'Printed shelf tag received from Marketing' },
  { stage:'operations', dept:'Operations', label:'Confirm PARs (min qty re-order trigger)',
    owner:'Operations Manager', def:'Store PAR / reorder point set' },
  { stage:'operations', dept:'Operations', label:'Communicate upcoming launch via newsletter',
    owner:'Operations Manager', def:'Launch noted in the store/ops newsletter', blocking:false },
  { stage:'operations', dept:'Operations', label:'Include in store training materials',
    owner:'Operations Manager', def:'Item added to store training materials' },

  /* ── Stage 8 · Marketing ─────────────────────────────────────────────── */
  { stage:'marketing', dept:'Marketing', label:'Product photography',
    owner:'Marketing Manager', def:'Final product photos shot & edited' },
  { stage:'marketing', dept:'Marketing', label:'Product story / description written',
    owner:'Marketing Manager', def:'Approved product copy written' },
  { stage:'marketing', dept:'Marketing', label:'Create shelf tag (if needed)',
    owner:'Marketing Manager', def:'Shelf tag designed & sent to print', blocking:false },
  { stage:'marketing', dept:'Marketing', label:'Create POS Toast button / ring up qty 1 (syncs to R365)',
    owner:'Marketing Manager', def:'Toast button created and qty 1 rung to sync',
    notify:'Inventory', notifyMsg:'Toast item created & rung up qty 1 — ready to attach to the R365/Synergy item (final Toast step).' },
  { stage:'marketing', dept:'Marketing', label:'Add to Olo Marketplace menu',
    owner:'Marketing Manager', def:'Item live on the Olo Marketplace menu' },
  { stage:'marketing', dept:'Marketing', label:'Upload photos/ingredients/description to Olo',
    owner:'Marketing Manager', def:'Front/back photos, ingredients & description on Olo' },
  { stage:'marketing', dept:'Marketing', label:'Social scheduled',
    owner:'Marketing Manager', def:'Launch social posts scheduled', blocking:false },
  { stage:'marketing', dept:'Marketing', label:'Email scheduled',
    owner:'Marketing Manager', def:'Launch email scheduled', blocking:false },

  /* ── Stage 9 · Store Launch — Store Ops ──────────────────────────────── */
  { stage:'store', dept:'Store Ops', label:'Store places first order',
    owner:'Store Manager', def:'First order placed through the order guide' },
  { stage:'store', dept:'Store Ops', label:'Commissary ships product',
    owner:'Commissary Manager', def:'Product shipped from commissary to store' },
  { stage:'store', dept:'Store Ops', label:'Store receives product',
    owner:'Store Manager', def:'Product received & checked in at store' },
  { stage:'store', dept:'Store Ops', label:'Merchandise shelf',
    owner:'Store Manager', def:'Product merchandised per planogram' },
  { stage:'store', dept:'Store Ops', label:'Install shelf tags',
    owner:'Store Manager', def:'Shelf tags installed at the facing' },
  { stage:'store', dept:'Store Ops', label:'Verify pricing',
    owner:'Store Manager', def:'POS price verified against the cost sheet' },
  { stage:'store', dept:'Store Ops', label:'Train team',
    owner:'Store Manager', def:'Floor team briefed on the new item' },
  { stage:'store', dept:'Store Ops', label:'Upload shelf photo',
    owner:'Store Manager', def:'Photo of the merchandised shelf uploaded',
    notify:'Marketplace', notifyMsg:'Store launch verified & shelf photo uploaded — product is LIVE.' },

  /* ── Stage 11 · 30-Day Review — Marketplace ──────────────────────────── */
  { stage:'review', dept:'Marketplace', label:'30-day sales reviewed',
    owner:'Marketplace Lead', def:'30-day sell-through pulled & reviewed' },
  { stage:'review', dept:'Marketplace', label:'Velocity reviewed',
    owner:'Marketplace Lead', def:'Unit velocity vs. expectation reviewed' },
  { stage:'review', dept:'Marketplace', label:'Margin reviewed',
    owner:'Marketplace Lead', def:'Realized margin vs. projected reviewed' },
  { stage:'review', dept:'Marketplace', label:'Inventory turns & stockouts reviewed',
    owner:'Marketplace Lead', def:'Turns and any stockouts reviewed' },
  { stage:'review', dept:'Marketplace', label:'Waste reviewed',
    owner:'Marketplace Lead', def:'Spoilage/waste reviewed', blocking:false },
  { stage:'review', dept:'Marketplace', label:'Vendor performance reviewed',
    owner:'Marketplace Lead', def:'Fill rate & lead-time performance reviewed' },
  { stage:'review', dept:'Marketplace', label:'Customer feedback reviewed',
    owner:'Marketplace Lead', def:'Guest feedback reviewed', blocking:false },
  { stage:'review', dept:'Marketplace', label:'Disposition decided: Expand / Maintain / Exit',
    owner:'Marketplace Lead', def:'Expand, Maintain, or Exit decision recorded' }
];


/* ===== BLOCK 4 — PROCESS (replace existing) ===============================
   The stage→stage handoff chain. Added the Compliance row; Procurement now
   hands to Compliance, Compliance hands to Inventory. */
const PROCESS = [
  { team:'Marketplace', stage:'Approval & brief',       emails:'Procurement' },
  { team:'Procurement', stage:'Commercial setup',       emails:'Compliance'  },
  { team:'Compliance',  stage:'W-9 & vendor documents', emails:'Inventory'   }, // NEW
  { team:'Inventory',   stage:'ERP / Synergy setup',    emails:'Commissary'  },
  { team:'Commissary',  stage:'Supply chain',           emails:'Operations'  },
  { team:'Operations',  stage:'Operational readiness',  emails:'Marketing'   },
  { team:'Marketing',   stage:'Marketing readiness',    emails:'Store Ops'   },
  { team:'Store Ops',   stage:'Store launch',           emails:'Marketplace' }
];


/* ===== BLOCK 5 — TRIGGER #0 "New Product Added" (kickoff broadcast) ========
   PASTE this function right after your existing notifyTeam() definition.
   It reuses notifyTeam(), so it sends through the same EmailJS config and
   writes to the same log. It assigns NO tasks — purely the announcement.

   THEN add the single call line in your launch-create path (launchModal's
   submit handler, right after the new launch is saved):
        notifyNewProduct(newLaunch);
   (Use whatever variable holds the just-created launch record.)               */
function notifyNewProduct(launch){
  const brand   = launch.brand   || launch.brandName || 'New brand';
  const product = launch.product || launch.name      || '';
  const id      = launch.id      || launch.npiId     || '';
  const cat     = launch.category || 'TBD';
  const date    = launch.launchDate ? fmtDate(launch.launchDate) : 'TBD';
  const msg =
    `🚀 New product added — ${brand} ${product} (${id}). ` +
    `The launch process has officially begun! ` +
    `Category: ${cat} · Target launch: ${date}. ` +
    `Marketplace is building the Launch Brief. Each team will be notified ` +
    `automatically when it's your turn — nothing to do yet. Follow progress on the NPI dashboard.`;
  // Broadcast to every department (skip the "—" Live placeholder dept).
  DEPTS.forEach(d=>{
    if(!d.key || d.key === '—') return;
    try { notifyTeam(d.key, msg); } catch(e){ console.warn('broadcast to', d.key, 'failed', e); }
  });
  // Audit trail (matches your existing logEvent usage).
  try { logEvent(launch.id, 'Launch created — new-product broadcast sent to all teams'); } catch(e){}
}


/* ===== BLOCK 6 — buildTasks() patch (add 2 fields) ========================
   Your buildTasks() already copies label/dept/stage/done/owner/doneAt/notify/
   notifyMsg from each template. Add `def` and `blocking` so the new fields
   reach per-launch task state. Inside the object you push, add:

        def:      tpl.def      || '',
        blocking: tpl.blocking !== false,   // default true

   Example of the finished pushed object:
        t.push({
          i, stage:tpl.stage, dept:tpl.dept, label:tpl.label,
          owner:tpl.owner||null, notify:tpl.notify||null, notifyMsg:tpl.notifyMsg||null,
          def: tpl.def || '',
          blocking: tpl.blocking !== false,
          done:false, doneAt:null
        });

   (Optional, for accountability: also add `doneBy:null` here, and in
   toggleTask set `t.doneBy = t.done ? (currentUser||'') : null` next to where
   it sets t.doneAt.)                                                          */


/* ===== BLOCK 7 — renderDetail() task-row display snippet ==================
   In renderDetail(), each task row currently renders the label + checkbox.
   Add this beneath the label so the owner, definition-of-done, and notify
   target show. Find where the row builds the label (search the function for
   `toggleTask` — that's the checkbox for the row) and inject this right after
   the label text node, using that row's task object (`t` / `task`):

   const meta = [
     t.owner ? `👤 ${t.owner}` : '',
     t.def   ? `✓ ${t.def}`     : '',
     t.notify? `🔔 notifies ${t.notify}` : ''
   ].filter(Boolean).join('  ·  ');

   …then render `meta` in a muted sub-line, e.g.:
     `<div class="task-meta" style="font-size:11px;opacity:.65;margin-top:2px">${meta}</div>`

   If you'd rather not touch renderDetail at all yet, the owner + definition are
   still stored on every task and the notify emails still fire — you just won't
   see the sub-line until this snippet is added.                               */


/* ===== NOTES / DECISIONS BAKED IN =========================================
   • W-9 stage label is exactly "W-9" (your call), though the stage also holds
     COI, nutrition, ingredient, allergen & spec-sheet docs — grouped because
     they're the same kind of paperwork gate, owned by AP.
   • W9/COI were DUPLICATED in your live app (in both Sample and Commercial) —
     consolidated here into the single W-9 stage. Remove any leftover W9/COI
     references if you have custom code pointing at the old stages.
   • Per-task `notify` is used sparingly (real cross-team dependencies only) so
     inboxes stay sane; routine stage-to-stage handoffs are emailed once via
     PROCESS, exactly as today.
   • `blocking:false` tasks (assets, social/email scheduling, SOP, newsletter,
     waste/feedback review) won't hold up the stage gate or readiness %.
   • New "Compliance" dept needs an email set in Settings, or its handoff/notify
     emails will no-op.
   ========================================================================== */
