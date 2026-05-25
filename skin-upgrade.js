/* skin-upgrade.js
   Injects the back button + (calendar) header, and replaces the assets
   page's text logo with the brand wordmark image. Idempotent: safe to
   re-run after React re-renders. */
(function () {
  const LOGO_SRC =
    'https://raw.githubusercontent.com/kallmeroth-netizen/MARKETINGHUB/' +
    'a5d8cf8a019ba9e6f3d9bc3afb115dca7d42549a/NeighborlyLogo.png';

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
    // Skip if some <nav> on the page already owns a back button
    if (document.querySelector('nav .skin-back')) return;
    const nav = document.querySelector('nav');
    if (!nav) return;
    nav.appendChild(makeBack()); // absolute-positioned, so position-in-flow doesn't matter
  }

  function replaceAssetsLogo() {
    if (!/neighborly-assets/i.test(location.pathname)) return;
    const mark = document.querySelector('.nav-mark');
    if (!mark || mark.querySelector('img')) return;
    mark.innerHTML =
      '<img src="' + LOGO_SRC + '" alt="Neighborly">';
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
    replaceAssetsLogo();
    ensureCalendarHeader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick);
  } else {
    tick();
  }
  // Re-run after React re-renders. The functions are idempotent so the cost
  // of running on every mutation is negligible.
  const obs = new MutationObserver(tick);
  obs.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
