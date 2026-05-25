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
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (t.closest && (t.closest('.np-hub-overlay') || t.closest('.hub-overlay'))) toggleHub(false);
  });
})();
