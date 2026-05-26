/* skin-upgrade.js
   Injects the back button (right cluster), the marketing calendar
   header (title on top, eyebrow below), replaces the assets text
   logo with the brand wordmark, and gives the assets page a hub
   dropdown matching the other pages. Idempotent and re-render safe. */
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
    const right = nav.querySelector('.nav-right');
    if (right) { right.appendChild(makeBack()); return; }
    const links = nav.querySelector('.nav-links');
    if (links && links.parentNode) { links.parentNode.appendChild(makeBack()); return; }
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

  /* Marketing calendar header: title on TOP, eyebrow BELOW it. */
  function ensureCalendarHeader() {
    if (!/neighborly-calendar/i.test(location.pathname)) return;
    if (document.querySelector('.skin-cal-header')) return;
    const nav = document.querySelector('nav');
    if (!nav || !nav.parentNode) return;
    const header = document.createElement('div');
    header.className = 'skin-cal-header';
    header.innerHTML =
      '<h1 class="skin-cal-title">Marketing Calendar</h1>' +
      '<div class="skin-cal-eyebrow">Campaigns &amp; scheduling</div>';
    nav.parentNode.insertBefore(header, nav.nextSibling);
  }

  /* Brand (assets) page: inject a hub dropdown so the page has the
     same Sales / Calendar / Brand / Guests navigation as the others. */
  const HUB_CARDS = [
    { key:'sales',    href:'neighborly-dashboard.html', title:'Performance Marketing', sub:'Weekly & all-time KPIs',      bg:'#fdf7d8', ic:'#b89a00',
      svg:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
    { key:'pmix',     href:'neighborly-pmix.html',      title:'Sales & Pmix',         sub:'Daily sales & menu mix',       bg:'#e3ece3', ic:'#5a7a5a',
      svg:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
    { key:'calendar', href:'neighborly-calendar.html',  title:'Marketing Calendar',   sub:'Campaigns & scheduling',       bg:'#e4f5ea', ic:'#2a7a4b',
      svg:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { key:'assets',   href:'neighborly-assets.html',    title:'Brand Guidelines',     sub:'Logos, fonts & templates',     bg:'#f7f0e4', ic:'#9c7a3c', active:true,
      svg:'<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M12 2v2M12 20v2M2 12h2M20 12h2"/>' },
    { key:'guests',   href:'neighborly-guests.html',    title:'Guest Intelligence',   sub:'Feedback & experience trends', bg:'#f0eff5', ic:'#5a4a7a',
      svg:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 3.5a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>' }
  ];

  function ensureBrandHubNav() {
    if (!/neighborly-assets/i.test(location.pathname)) return;
    if (document.getElementById('skin-brand-hub')) return;
    if (!document.body) return;

    const overlay = document.createElement('div');
    overlay.className = 'hub-overlay';
    overlay.id = 'skin-brand-overlay';
    document.body.appendChild(overlay);

    const hub = document.createElement('div');
    hub.className = 'hub-nav';
    hub.id = 'skin-brand-hub';
    hub.innerHTML =
      '<div class="hub-nav-label">Neighborly Marketing Hub</div>' +
      '<div class="hub-nav-grid">' +
      HUB_CARDS.map(function (c) {
        return '<a class="hub-card' + (c.active ? ' active' : '') + '" href="' + c.href + '">' +
          '<div class="hub-card-icon" style="background:' + c.bg + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="' + c.ic + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + c.svg + '</svg>' +
          '</div>' +
          '<div class="hub-card-title">' + c.title + '</div>' +
          '<div class="hub-card-sub">' + c.sub + '</div>' +
          '</a>';
      }).join('') +
      '</div>';
    document.body.appendChild(hub);

    function toggle(open) {
      const next = (typeof open === 'boolean') ? open : !hub.classList.contains('open');
      hub.classList.toggle('open', next);
      overlay.classList.toggle('open', next);
    }
    // Make the brand wordmark act as the hub trigger.
    const mark = document.querySelector('.nav-mark');
    if (mark && !mark.dataset.hubBound) {
      mark.dataset.hubBound = '1';
      mark.style.cursor = 'pointer';
      mark.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
      // Tiny chevron next to the logo so users know it's a dropdown.
      const chev = document.createElement('span');
      chev.setAttribute('aria-hidden', 'true');
      chev.style.cssText = 'display:inline-flex;align-items:center;margin-left:6px;color:rgba(31,35,40,0.45);transition:transform 0.2s ease';
      chev.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      mark.parentNode.insertBefore(chev, mark.nextSibling);
      // Visual feedback when open
      const obs = new MutationObserver(function () {
        chev.style.transform = hub.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0)';
      });
      obs.observe(hub, { attributes: true, attributeFilter: ['class'] });
    }
    overlay.addEventListener('click', function () { toggle(false); });
  }

  function tick() {
    ensureBack();
    replaceAssetsLogo();
    ensureCalendarHeader();
    ensureBrandHubNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick);
  } else {
    tick();
  }
  const obs = new MutationObserver(tick);
  obs.observe(document.body || document.documentElement, {
    childList: true, subtree: true,
  });
})();
