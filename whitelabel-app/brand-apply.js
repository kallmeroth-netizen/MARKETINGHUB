/* ============================================================
   brand-apply.js — runtime white-label rebrand engine
   ------------------------------------------------------------
   Included early on EVERY page. Applies the active brand
   (window.Brand.get()) to the live document so one config
   rebrands the whole app:

     1. Colors  — inject a <style> overriding theme.css :root tokens.
     2. Logos   — swap every logo <img> to the brand logo (or a
                  neutral placeholder), keeping the exact placement.
     3. Name    — replace {{BRAND}} / {{TAGLINE}} tokens, fill any
                  [data-brand-name] / [data-brand-tagline] element,
                  and rewrite the <title>.
     4. Chrome  — favicon (emoji) + <meta name=theme-color>.

   Re-applies on the 'brand:changed' event so wizard edits show
   instantly without a reload.

   Requires: brand.default.js → brand-config.js loaded first.
   ============================================================ */
(function () {
  'use strict';

  if (!window.Brand) {
    console.error('[brand-apply] window.Brand missing — load brand-config.js first');
    return;
  }

  var PLACEHOLDER_LOGO = 'assets/placeholder-logo.svg';

  /* ---------- helpers ---------- */

  // Darken/lighten a hex color by pct (-1..1) for -light / -deep variants.
  function shade(hex, pct) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return hex;
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    var t = pct < 0 ? 0 : 255, p = Math.abs(pct);
    function mix(c) { return Math.round((t - c) * p + c); }
    function hx(c) { return ('0' + c.toString(16)).slice(-2); }
    return '#' + hx(mix(r)) + hx(mix(g)) + hx(mix(b));
  }

  // Clean monogram favicon — the brand's first initial on a rounded square in
  // the primary color. No emoji. Regenerates whenever name/color changes.
  // "r, g, b" from a hex color, for building rgba() strings.
  function rgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return '91, 108, 255';
    return parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16);
  }

  function faviconDataUrl(b) {
    var c = (b.colors && b.colors.primary) || '#5b6cff';
    var letter = ((b.name || 'B').trim().charAt(0) || 'B').toUpperCase();
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
              '<rect width="100" height="100" rx="24" fill="' + c + '"/>' +
              '<text x="50" y="50" dy="0.35em" text-anchor="middle" font-size="60" ' +
              'font-family="Jost,Futura,Arial,sans-serif" font-weight="700" fill="#fff">' + letter + '</text>' +
              '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /* ---------- 1. colors ---------- */

  function applyColors(b) {
    var c = b.colors || {};
    // Map the brand palette onto BOTH the theme.css token names and the
    // inline token names used by the ported login page (index.html), so a
    // single palette drives every surface identically.
    var css =
      ':root{' +
        // primary "action" family
        '--brand-orange:' + c.primary + ';' +
        '--brand-orange-light:' + shade(c.primary, 0.82) + ';' +
        '--brand-orange-deep:' + shade(c.primary, -0.25) + ';' +
        '--accent:' + (c.accent || c.primary) + ';' +
        // hue families for the hub tiles
        '--brand-yellow:' + c.yellow + ';--brand-yellow-light:' + shade(c.yellow, 0.8) + ';--brand-yellow-deep:' + shade(c.yellow, -0.3) + ';' +
        '--brand-green:' + c.green + ';--brand-green-light:' + shade(c.green, 0.82) + ';--brand-green-deep:' + shade(c.green, -0.3) + ';' +
        '--brand-blue:' + c.blue + ';--brand-blue-light:' + shade(c.blue, 0.85) + ';--brand-blue-deep:' + shade(c.blue, -0.3) + ';' +
        '--brand-lavender:' + c.lavender + ';--brand-lavender-light:' + shade(c.lavender, 0.85) + ';--brand-lavender-deep:' + shade(c.lavender, -0.3) + ';' +
        '--brand-tan:' + c.tan + ';--brand-tan-light:' + shade(c.tan, 0.8) + ';--brand-tan-deep:' + shade(c.tan, -0.3) + ';' +
        // neutrals / text
        '--ink:' + c.ink + ';--text:' + c.ink + ';' +
        '--cream:' + c.bg + ';--bg:' + c.bg + ';' +
        '--surface:' + c.surface + ';' +
        // inline token names used by index.html <style>
        '--orange:' + c.primary + ';--yellow:' + c.yellow + ';--green:' + c.green + ';' +
        '--lav:' + c.lavender + ';--blue:' + c.blue + ';--sand:' + c.tan + ';' +
        '--dark:' + c.ink + ';' +
        // theme.css defines --shadow-orange as a literal rgba (not derived from
        // a token), so buttons keep a stale orange glow unless we override it
        // from the primary color here. Kept Apple-soft (low alpha, small blur).
        '--shadow-orange:0 2px 8px rgba(' + rgb(c.primary) + ',0.20);' +
      '}';

    var el = document.getElementById('wl-brand-colors');
    if (!el) {
      el = document.createElement('style');
      el.id = 'wl-brand-colors';
      document.head.appendChild(el);
    }
    el.textContent = css;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', c.primary || c.ink);
  }

  /* ---------- 2. logos ---------- */

  function applyLogos(b) {
    var src = b.logoUrl && b.logoUrl.trim() ? b.logoUrl : PLACEHOLDER_LOGO;
    // Match: explicit opt-in, or any <img> whose src looks like a logo asset.
    var imgs = document.querySelectorAll(
      'img[data-brand-logo], img[src*="placeholder-logo"], img[src*="logo"], img[src*="Logo"]'
    );
    imgs.forEach(function (img) {
      img.src = src;
      img.setAttribute('alt', b.name || 'Brand');
      // Placeholder SVG already carries its own color; a real uploaded logo
      // should not be tinted by the page's brightness(0) filter.
      if (b.logoUrl) img.style.filter = 'none';
    });
  }

  /* ---------- 3. name / tagline ---------- */

  function replaceTokens(b) {
    var name = b.name || 'Your Brand';
    var tag  = b.tagline || '';

    // 3a. Elements that opt in explicitly.
    document.querySelectorAll('[data-brand-name]').forEach(function (el) {
      el.textContent = name;
    });
    document.querySelectorAll('[data-brand-tagline]').forEach(function (el) {
      el.textContent = tag;
    });

    // 3b. {{BRAND}} / {{TAGLINE}} tokens anywhere in text nodes.
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) {
      var n = walker.currentNode;
      if (n.nodeValue && (n.nodeValue.indexOf('{{BRAND}}') !== -1 || n.nodeValue.indexOf('{{TAGLINE}}') !== -1)) {
        nodes.push(n);
      }
    }
    nodes.forEach(function (n) {
      n.nodeValue = n.nodeValue.replace(/\{\{BRAND\}\}/g, name).replace(/\{\{TAGLINE\}\}/g, tag);
    });

    // 3c. Title.
    if (document.title.indexOf('{{BRAND}}') !== -1) {
      document.title = document.title.replace(/\{\{BRAND\}\}/g, name);
    }
  }

  /* ---------- 4. favicon ---------- */

  function applyFavicon(b) {
    // Replace any existing icons with a single emoji favicon.
    document.querySelectorAll('link[rel~="icon"]').forEach(function (l) { l.remove(); });
    var link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconDataUrl(b);
    document.head.appendChild(link);
  }

  /* ---------- orchestration ---------- */

  function apply() {
    var b = window.Brand.get();
    applyColors(b);           // safe pre-DOMContentLoaded (writes to <head>)
    applyFavicon(b);
    if (document.body) {
      applyLogos(b);
      replaceTokens(b);
    }
  }

  // Colors + favicon can go immediately; DOM-dependent bits wait for body.
  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  }
  // Nav/hub is injected by chrome-v2.js slightly after load — re-apply so the
  // freshly-injected logo + labels get branded too.
  setTimeout(apply, 300);
  setTimeout(apply, 1000);

  // Live updates from the wizard.
  window.addEventListener('brand:changed', apply);
})();
