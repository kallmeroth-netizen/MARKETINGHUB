/* chrome.js — hub dropdown toggle + chevron state for any np-nav page.
   - If the page already defines window.toggleHubNav (legacy pages with
     their own hub-nav), we don't clobber it.
   - Supports both .np-hub (new) and legacy .hub-nav markup. */
(function () {
  function toggleHub(force) {
    const hub = document.querySelector('.np-hub') || document.querySelector('.hub-nav');
    const ovl = document.querySelector('.np-hub-overlay') || document.querySelector('.hub-overlay');
    const brand = document.querySelector('.np-nav-brand');
    if (!hub) return;
    const isOpen = hub.classList.contains('is-open') || hub.classList.contains('open');
    const next = typeof force === 'boolean' ? force : !isOpen;
    // toggle both class systems so legacy + new react the same way
    hub.classList.toggle('is-open', next);
    hub.classList.toggle('open',    next);
    if (ovl) { ovl.classList.toggle('is-open', next); ovl.classList.toggle('open', next); }
    if (brand) brand.classList.toggle('open', next);
  }
  // Only register window.toggleHubNav if the page hasn't already
  if (typeof window.toggleHubNav !== 'function') {
    window.toggleHubNav = function (e) { if (e && e.preventDefault) e.preventDefault(); toggleHub(); };
  }
  // Delegated click — works even when the inline onclick is stripped/clobbered
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!t.closest) return;
    if (t.closest('.np-hub-overlay') || t.closest('.hub-overlay')) { toggleHub(false); return; }
    if (e.defaultPrevented) return; // inline onclick already handled it
    const brand = t.closest('.np-nav-brand');
    if (!brand) return;
    if (brand.closest('#root')) return; // React-rendered nav handles its own click
    // Opt-out: a brand mark can disable the hub via data-no-hub or hub-nav being absent
    if (brand.dataset && brand.dataset.noHub === '1') return;
    if (!document.querySelector('.np-hub, .hub-nav')) return;
    e.preventDefault(); toggleHub();
  });
})();

/* Move the settings icon out of the sticky nav so its `position: fixed`
   is resolved against the viewport (the nav's backdrop-filter creates a
   containing block that traps fixed children). Idempotent and safe to
   call on any page — we just re-parent the button to <body>. */
(function () {
  function relocateSettings() {
    var btns = document.querySelectorAll(
      '.np-icon-btn[title*="ettings"], .np-icon-btn[aria-label*="ettings"], .settings-btn'
    );
    btns.forEach(function (b) {
      if (b.dataset.npRelocated === '1') return;
      if (b.closest('.np-nav') || b.closest('nav')) {
        b.dataset.npRelocated = '1';
        document.body.appendChild(b);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', relocateSettings);
  } else {
    relocateSettings();
  }
  // React-rendered navs (calendar) mount later — re-run on a short delay
  setTimeout(relocateSettings, 100);
  setTimeout(relocateSettings, 800);
})();

/* Calendar page: the React app keeps its own setHubOpen() local state,
   but the new canonical np-hub is rendered as STATIC html outside the
   React tree. Wire the brand mark click (any .nav-logo-wrap / .np-nav-brand)
   to the static dropdown so it opens regardless of React state. */
(function () {
  if (!/neighborly-calendar/i.test(location.pathname)) return;
  document.addEventListener('click', function (e) {
    const brand = e.target.closest && e.target.closest('.nav-logo-wrap, .np-nav-brand');
    if (!brand) return;
    e.preventDefault(); e.stopPropagation();
    const hub = document.querySelector('.np-hub#calHub');
    const ovl = document.querySelector('.np-hub-overlay#calHubOverlay');
    if (!hub) return;
    const open = !hub.classList.contains('is-open');
    hub.classList.toggle('is-open', open);
    if (ovl) ovl.classList.toggle('is-open', open);
  }, true);
})();

/* Shared hub navigator. Single source of truth for the logo-click menu so
   every page shows the same set of destinations, filtered by the signed-in
   user's role. Before this, each page had a hand-rolled list that drifted
   (some omitted Paid Ads, none filtered by role, ops pages only showed ops
   links, admin had no menu at all). On load we:
     1) Inject a default nav + hub markup into any page whose
        #np-nav-placeholder is empty (admin).
     2) Replace the contents of every .np-hub-grid and .hub-nav-grid on the
        page with a canonical, role-filtered card list. The current page
        gets the .is-active / .active class so it reads as "you are here".
   index.html is skipped — it already owns the canonical role-aware hub
   and switches CURRENT_SIDE via applySide(). */
(function () {
  'use strict';

  const HUB_ITEMS = [
    { key:'home',        label:'Home',                  sub:'Hub overview',                  href:'index.html',                  bg:'#efece2', stroke:'#1f2328', roles:['team','guest','ops','admin'],
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>' },
    { key:'sales',       label:'Performance Marketing', sub:'Weekly & all-time KPIs',        href:'neighborly-dashboard.html',   bg:'#fdf7d8', stroke:'#b89a00', roles:['team','guest','admin'],
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
    { key:'pmix',        label:'Sales & Pmix',          sub:'Daily sales & product mix',     href:'neighborly-pmix.html',        bg:'#e3ece3', stroke:'#5a7a5a', roles:['team','guest','admin'],
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>' },
    { key:'calendar',    label:'Marketing Calendar',    sub:'Campaigns & scheduling',        href:'neighborly-calendar.html',    bg:'#e4f5ea', stroke:'#7bbd91', roles:['team','guest','admin'],
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
    { key:'assets',      label:'Brand Assets',          sub:'Logos & templates',             href:'neighborly-assets.html',      bg:'#f7f0e4', stroke:'#9c7a3c', roles:['team','guest','admin'],
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>' },
    { key:'guests',      label:'Guest Intelligence',    sub:'Feedback & experience trends',  href:'neighborly-guests.html',      bg:'#f0eff5', stroke:'#5a4a7a', roles:['team','admin'],
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 3.5a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/></svg>' },
    { key:'opslabor',    label:'Labor & SPLH',          sub:'SPLH, hours, OT, labor %',      href:'neighborly-labor.html',       bg:'#e4f5ea', stroke:'#1e5a37', roles:['ops','admin'],
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h4l3 7 4-16 3 9h4"/></svg>' },
    { key:'admin',       label:'Admin',                 sub:'User management',               href:'neighborly-admin.html',       bg:'#efece2', stroke:'#1f2328', roles:['admin'],
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M18 14l1.5 1.5L22 13"/></svg>' }
  ];

  const PATH_TO_KEY = {};
  HUB_ITEMS.forEach(function (i) { PATH_TO_KEY[i.href.toLowerCase()] = i.key; });

  function currentKey() {
    const p = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!p || p === 'index.html') return 'home';
    return PATH_TO_KEY[p] || null;
  }

  async function detectRole() {
    try {
      if (window.NPData && typeof window.NPData.getRole === 'function') {
        const r = await window.NPData.getRole();
        if (r) return r;
      }
    } catch (e) { /* fall through to defaults */ }
    if (sessionStorage.getItem('nbly_guest') === '1') return 'guest';
    return 'team';
  }

  function cardHtml(item, isActive, container) {
    const isNp = container === 'np';
    const card = isNp ? 'np-hub-card' : 'hub-card';
    const ico  = isNp ? 'np-hub-card-ico' : 'hub-card-icon';
    const ttl  = isNp ? 'np-hub-card-title' : 'hub-card-title';
    const sub  = isNp ? 'np-hub-card-sub' : 'hub-card-sub';
    const act  = isNp ? 'is-active' : 'active';
    const svg = item.svg.replace('stroke="currentColor"', 'stroke="' + item.stroke + '"');
    return '<a class="' + card + (isActive ? ' ' + act : '') + '" data-hub-key="' + item.key + '" href="' + item.href + '">' +
             '<div class="' + ico + '" style="background:' + item.bg + '">' + svg + '</div>' +
             '<div class="' + ttl + '">' + item.label + '</div>' +
             '<div class="' + sub + '">' + item.sub + '</div>' +
           '</a>';
  }

  // Build a minimal nav + hub for pages whose #np-nav-placeholder is empty
  // (admin), so they get the same logo + menu as every other page.
  function ensureNavOnPlaceholder() {
    const ph = document.getElementById('np-nav-placeholder');
    if (!ph || ph.children.length > 0) return;
    const tag = document.body.dataset.pageTag || (document.title.split('—')[0] || '').trim() || '';
    ph.outerHTML =
      '<nav class="np-nav">' +
        '<a class="np-nav-brand" onclick="toggleHubNav(event)" aria-label="Open hub">' +
          '<img src="NeighborlyLogo.png" alt="Neighborly">' +
          '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</a>' +
        '<div class="np-nav-right">' +
          (tag ? '<span class="np-nav-page-tag">' + tag + '</span>' : '') +
          '<a class="np-icon-btn" href="index.html" title="Back to home" aria-label="Back to home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></a>' +
        '</div>' +
      '</nav>' +
      '<div class="np-hub-overlay" aria-hidden="true"></div>' +
      '<div class="np-hub" role="dialog" aria-label="Marketing Hub">' +
        '<div class="np-hub-label"><span>Neighborly Marketing Hub</span><a href="index.html" class="np-hub-back-home">&larr; Home</a></div>' +
        '<div class="np-hub-grid"></div>' +
      '</div>';
  }

  async function renderSharedHubs() {
    // index.html owns its own role-aware hub via applySide(); leave it alone.
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!path || path === 'index.html') return;

    ensureNavOnPlaceholder();

    const role = await detectRole();
    const active = currentKey();
    const visible = HUB_ITEMS.filter(function (i) { return i.roles.indexOf(role) !== -1; });

    document.querySelectorAll('.np-hub-grid').forEach(function (grid) {
      grid.innerHTML = visible.map(function (i) { return cardHtml(i, i.key === active, 'np'); }).join('');
    });
    document.querySelectorAll('.hub-nav-grid').forEach(function (grid) {
      grid.innerHTML = visible.map(function (i) { return cardHtml(i, i.key === active, 'hub'); }).join('');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSharedHubs);
  } else {
    renderSharedHubs();
  }
  // React-rendered navs (calendar) and async-mounted shells may inject the
  // hub container after DOMContentLoaded — re-run once shortly after.
  setTimeout(renderSharedHubs, 400);
  setTimeout(renderSharedHubs, 1200);
})();

