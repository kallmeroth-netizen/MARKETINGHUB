/* skin-upgrade.js
   Injects the back button (now on the right, next to settings), the
   marketing calendar header, and replaces the assets page text logo
   with the brand wordmark. Idempotent: safe to re-run after React
   re-renders. */
(function () {
  const LOGO_SRC = 'NeighborlyLogo.png';

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
    if (document.querySelector('nav .skin-back')) return;
    const nav = document.querySelector('nav');
    if (!nav) return;

    // Prefer injection INTO an existing right-side cluster so the back
    // button becomes a flex sibling of the settings/refresh icons.
    const right = nav.querySelector('.nav-right');
    if (right) {
      right.appendChild(makeBack());
      return;
    }
    // Assets page: there's a .nav-links group on the right edge.
    const links = nav.querySelector('.nav-links');
    if (links && links.parentNode) {
      links.parentNode.appendChild(makeBack());
      return;
    }
    // Fallback (React calendar): append straight to nav. CSS positions
    // it absolutely on the right via the .skin-back-fallback rule.
    const a = makeBack();
    a.classList.add('skin-back-fallback');
    nav.appendChild(a);
  }

  function replaceAssetsLogo() {
    if (!/neighborly-assets/i.test(location.pathname)) return;
    const mark = document.querySelector('.nav-mark');
    if (!mark || mark.querySelector('img')) return;
    mark.innerHTML = '<img src="' + LOGO_SRC + '" alt="Neighborly">';
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
  const obs = new MutationObserver(tick);
  obs.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
