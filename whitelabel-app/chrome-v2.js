/* chrome-v2.js — shared nav/hub for the white-label app (ported).
   - Toggles the logo-click hub dropdown on any np-nav page.
   - Injects a default nav + hub into pages whose #np-nav-placeholder is
     empty (e.g. admin.html).
   - Renders a single canonical, role-filtered hub grid so every page shows
     the same destinations. index.html owns its own hub and is skipped.

   Branding (logo, name, colors) is handled separately by brand-apply.js;
   here the hub label uses the {{BRAND}} token so it rebrands too. */
(function () {
  function toggleHub(force) {
    var hub = document.querySelector('.np-hub') || document.querySelector('.hub-nav');
    var ovl = document.querySelector('.np-hub-overlay') || document.querySelector('.hub-overlay');
    var brand = document.querySelector('.np-nav-brand');
    if (!hub) return;
    var isOpen = hub.classList.contains('is-open') || hub.classList.contains('open');
    var next = typeof force === 'boolean' ? force : !isOpen;
    hub.classList.toggle('is-open', next);
    hub.classList.toggle('open', next);
    if (ovl) { ovl.classList.toggle('is-open', next); ovl.classList.toggle('open', next); }
    if (brand) brand.classList.toggle('open', next);
  }
  if (typeof window.toggleHubNav !== 'function') {
    window.toggleHubNav = function (e) { if (e && e.preventDefault) e.preventDefault(); toggleHub(); };
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    if (t.closest('.np-hub-overlay') || t.closest('.hub-overlay')) { toggleHub(false); return; }
    if (e.defaultPrevented) return;
    var brand = t.closest('.np-nav-brand');
    if (!brand) return;
    if (brand.dataset && brand.dataset.noHub === '1') return;
    if (!document.querySelector('.np-hub, .hub-nav')) return;
    e.preventDefault(); toggleHub();
  });
})();

/* Move any settings icon out of the sticky nav so position:fixed resolves
   against the viewport (nav's backdrop-filter traps fixed children). */
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
  } else { relocateSettings(); }
  setTimeout(relocateSettings, 100);
  setTimeout(relocateSettings, 800);
})();

/* Shared hub navigator — single source of truth for the logo-click menu.
   Destinations map to the white-label pages that ship today; modules not yet
   built route to coming-soon.html so the product reads complete. */
(function () {
  'use strict';

  // The tab catalog is centralized in hub-modules.js (window.HubModules).
  function pathToKey() {
    var map = {};
    var all = [window.HubModules.HOME, window.HubModules.ADMIN].concat(window.HubModules.MODULES);
    all.forEach(function (i) { map[i.href.split('?')[0].toLowerCase()] = i.key; });
    return map;
  }

  function currentKey() {
    var p = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!p || p === 'index.html') return 'home';
    return pathToKey()[p] || null;
  }

  async function detectRole() {
    try {
      if (window.NPData && typeof window.NPData.getRole === 'function') {
        var r = await window.NPData.getRole();
        if (r) return r;
      }
    } catch (e) { /* defaults below */ }
    if (sessionStorage.getItem('wl_guest') === '1') return 'guest';
    return 'team';
  }

  function cardHtml(item, isActive, container) {
    var isNp = container === 'np';
    var card = isNp ? 'np-hub-card' : 'hub-card';
    var ico  = isNp ? 'np-hub-card-ico' : 'hub-card-icon';
    var ttl  = isNp ? 'np-hub-card-title' : 'hub-card-title';
    var sub  = isNp ? 'np-hub-card-sub' : 'hub-card-sub';
    var act  = isNp ? 'is-active' : 'active';
    var svg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + item.stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + item.icon + '</svg>';
    var target = item.external ? ' target="_blank" rel="noopener"' : '';
    return '<a class="' + card + (isActive ? ' ' + act : '') + '" data-hub-key="' + item.key + '" href="' + item.href + '"' + target + '>' +
             '<div class="' + ico + '" style="background:' + item.bg + '">' + svg + '</div>' +
             '<div class="' + ttl + '">' + item.label + '</div>' +
             '<div class="' + sub + '">' + item.sub + '</div>' +
           '</a>';
  }

  function ensureNavOnPlaceholder() {
    var ph = document.getElementById('np-nav-placeholder');
    if (!ph || ph.children.length > 0) return;
    var tag = document.body.dataset.pageTag || (document.title.split('—')[0] || '').trim() || '';
    ph.outerHTML =
      '<nav class="np-nav">' +
        '<a class="np-nav-brand" onclick="toggleHubNav(event)" aria-label="Open hub">' +
          '<img data-brand-logo src="assets/placeholder-logo.svg" alt="Brand">' +
          '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</a>' +
        '<div class="np-nav-right">' +
          (tag ? '<span class="np-nav-page-tag">' + tag + '</span>' : '') +
          '<a class="np-icon-btn" href="index.html" title="Back to home" aria-label="Back to home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></a>' +
        '</div>' +
      '</nav>' +
      '<div class="np-hub-overlay" aria-hidden="true"></div>' +
      '<div class="np-hub" role="dialog" aria-label="Marketing Hub">' +
        '<div class="np-hub-label"><span>{{BRAND}} Marketing Hub</span><a href="index.html" class="np-hub-back-home">&larr; Home</a></div>' +
        '<div class="np-hub-grid"></div>' +
      '</div>';
  }

  async function renderSharedHubs() {
    if (!window.HubModules) return; // catalog not loaded yet
    var path = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!path || path === 'index.html') return;

    ensureNavOnPlaceholder();

    var role = await detectRole();
    var active = currentKey();
    var visible = window.HubModules.buildHubItems(role);

    document.querySelectorAll('.np-hub-grid').forEach(function (grid) {
      grid.innerHTML = visible.map(function (i) { return cardHtml(i, i.key === active, 'np'); }).join('');
    });
    document.querySelectorAll('.hub-nav-grid').forEach(function (grid) {
      grid.innerHTML = visible.map(function (i) { return cardHtml(i, i.key === active, 'hub'); }).join('');
    });

    // Let brand-apply.js rebrand the freshly-injected {{BRAND}} label + logo.
    try { window.dispatchEvent(new CustomEvent('brand:changed', { detail: window.Brand && window.Brand.get() })); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSharedHubs);
  } else { renderSharedHubs(); }
  setTimeout(renderSharedHubs, 400);
  setTimeout(renderSharedHubs, 1200);
})();
