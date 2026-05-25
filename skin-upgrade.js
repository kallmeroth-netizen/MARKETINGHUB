/* skin-upgrade.js
   Injects the back button into every page's nav and adds a marketing
   calendar header on neighborly-calendar.html (which renders through
   React and has no static title element). Tolerant of late mounts and
   React re-renders.
*/
(function () {
  function makeBack() {
    const a = document.createElement('a');
    a.className = 'skin-back';
    a.href = 'index.html';
    a.setAttribute('aria-label', 'Back to home');
    a.title = 'Back to home';
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="15 18 9 12 15 6"/></svg>';
    return a;
  }

  function ensureBack() {
    // 1) Standard pages — top-level <nav>
    const nav = document.querySelector('nav');
    if (nav && !nav.querySelector(':scope > .skin-back')) {
      nav.insertBefore(makeBack(), nav.firstChild);
    }
    // 2) Assets-style nav with inner wrapper
    const inner = document.querySelector('nav .nav-inner');
    if (inner && !inner.querySelector(':scope > .skin-back')) {
      inner.insertBefore(makeBack(), inner.firstChild);
    }
  }

  function ensureCalendarHeader() {
    if (!/neighborly-calendar/i.test(location.pathname)) return;
    if (document.querySelector('.skin-cal-header')) return;
    const nav = document.querySelector('nav');
    if (!nav || !nav.parentNode) return;
    const header = document.createElement('div');
    header.className = 'skin-cal-header';
    header.innerHTML =
      '<div class="skin-cal-eyebrow">Campaigns &amp; scheduling</div>' +
      '<h1 class="skin-cal-title">Marketing Calendar</h1>';
    nav.parentNode.insertBefore(header, nav.nextSibling);
  }

  function tick() {
    ensureBack();
    ensureCalendarHeader();
  }

  // Initial run + a couple retries for late React mounts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick);
  } else {
    tick();
  }
  // Watch for re-renders that might wipe the injected nodes
  const obs = new MutationObserver(() => tick());
  obs.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
