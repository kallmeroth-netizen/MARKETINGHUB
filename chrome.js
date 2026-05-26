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
    if (brand && !brand.closest('#root')) { e.preventDefault(); toggleHub(); }
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

