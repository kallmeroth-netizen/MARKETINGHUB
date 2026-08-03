/* ============================================================
   brand-config.js — active brand config: load / save / merge
   ------------------------------------------------------------
   Single source of truth for the *active* brand. Reads the config
   the wizard wrote to localStorage, deep-merged over the shipped
   defaults (brand.default.js) so a partial/older saved config never
   leaves a field undefined.

   Load order on every page:
     brand.default.js  →  brand-config.js  →  brand-apply.js
   Requires window.WL_DEFAULT_BRAND + window.WL_BRAND_KEY to exist.

   Public API (window.Brand):
     Brand.get()            → the merged active config (object)
     Brand.save(partial)    → deep-merge partial, persist, return merged
     Brand.reset()          → wipe saved config, revert to defaults
     Brand.isConfigured()   → true once Supabase url+anonKey are set
     Brand.isSetupComplete()→ true once the wizard Finish ran
   ============================================================ */
(function () {
  'use strict';

  var KEY = window.WL_BRAND_KEY || 'wl_brand';
  var DEFAULTS = window.WL_DEFAULT_BRAND || {};

  // Deep-merge plain objects (source over target), returning a new object.
  // Arrays and non-objects are replaced wholesale.
  function deepMerge(target, source) {
    var out = Array.isArray(target) ? target.slice() : Object.assign({}, target);
    if (!source || typeof source !== 'object') return out;
    Object.keys(source).forEach(function (k) {
      var sv = source[k];
      if (sv && typeof sv === 'object' && !Array.isArray(sv) &&
          out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], sv);
      } else {
        out[k] = sv;
      }
    });
    return out;
  }

  function readSaved() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[brand] could not parse saved config', e);
      return null;
    }
  }

  var cache = null;

  function get() {
    if (cache) return cache;
    cache = deepMerge(DEFAULTS, readSaved() || {});
    return cache;
  }

  function save(partial) {
    var merged = deepMerge(get(), partial || {});
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('[brand] could not persist config', e);
    }
    cache = merged;
    // Let any live page re-apply branding without a reload.
    try {
      window.dispatchEvent(new CustomEvent('brand:changed', { detail: merged }));
    } catch (e) { /* CustomEvent unsupported — callers can reload */ }
    return merged;
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    cache = null;
    return get();
  }

  function isConfigured() {
    var b = get();
    return !!(b.supabase && b.supabase.url && b.supabase.anonKey);
  }

  function isSetupComplete() {
    return !!get().setupComplete;
  }

  window.Brand = {
    get: get,
    save: save,
    reset: reset,
    isConfigured: isConfigured,
    isSetupComplete: isSetupComplete
  };
})();
