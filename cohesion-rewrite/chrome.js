/* chrome.js — hub dropdown toggle + chevron state for any np-nav page.
   Pages keep their own page JS (charts, filters, etc.); this only
   handles the canonical chrome interactions defined by theme.css. */
(function () {
  function toggleHub(force) {
    const hub = document.querySelector('.np-hub');
    const ovl = document.querySelector('.np-hub-overlay');
    const brand = document.querySelector('.np-nav-brand');
    if (!hub) return;
    const next = typeof force === 'boolean' ? force : !hub.classList.contains('is-open');
    hub.classList.toggle('is-open', next);
    if (ovl) ovl.classList.toggle('is-open', next);
    if (brand) brand.classList.toggle('open', next);
  }
  window.toggleHubNav = function (e) { if (e && e.preventDefault) e.preventDefault(); toggleHub(); };
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (t.closest && t.closest('.np-hub-overlay')) toggleHub(false);
  });
})();
