/* ============================================================
   brand.default.js — neutral placeholder brand
   ------------------------------------------------------------
   This is the factory-default identity the white-label app ships
   with, before any brand runs the setup wizard. Everything here
   is a placeholder: a generic name, a placeholder logo, a neutral
   slate/indigo palette, and empty backend + data-source slots.

   The setup wizard (setup.html) writes a merged copy of this shape
   to localStorage under WL_BRAND_KEY; brand-config.js reads it back.
   Nothing in here references any specific customer brand.
   ============================================================ */
(function () {
  'use strict';

  window.WL_BRAND_KEY = 'wl_brand';

  window.WL_DEFAULT_BRAND = {
    // — Identity —
    name:    'Your Brand',
    tagline: 'Marketing Hub',
    // logoUrl may be a hosted URL or a data: URL (uploaded via the wizard).
    // Empty string → brand-apply.js falls back to assets/placeholder-logo.svg.
    logoUrl:     '',
    logoDarkUrl: '',
    // No emoji favicons — brand-apply.js generates a clean monogram (the
    // brand's first initial) in the primary color until a logo is uploaded.

    // Opening line on the sign-in screen (replaces the old "Welcome." line).
    // Brand-editable in the wizard. The hub hero uses a time-aware greeting.
    greeting: 'Welcome back.',

    // — Palette — mapped onto theme.css :root tokens at runtime.
    // High-tech, cool-toned defaults: electric indigo + cyan on a seamless
    // off-white base. A brand replaces these in the wizard.
    colors: {
      primary:   '#5b6cff',   // buttons, active accents (electric indigo)
      accent:    '#22d3ee',   // secondary highlight (cyan)
      ink:       '#0f1522',   // primary text / logo tint (deep navy-black)
      bg:        '#f4f5fa',   // page background (seamless cool off-white)
      surface:   '#ffffff',   // cards
      // Hub tile hues — cohesive cool/jewel set so tiles read distinct without
      // looking like crayons. (Keys kept for back-compat with the token map.)
      yellow:    '#f59e0b',   // amber (single warm pop for contrast)
      green:     '#10b981',   // emerald
      blue:      '#38bdf8',   // sky
      lavender:  '#8b5cf6',   // violet
      tan:       '#94a3b8'    // slate
    },

    // — Backend — each brand points at their OWN Supabase project.
    // Empty until entered in the wizard. When empty, the app runs in
    // "not connected" mode and routes first-run visitors to setup.html.
    supabase: {
      url:     '',
      anonKey: ''
    },

    // — Data sources / API keys — "add API here" fields from the wizard.
    // status: 'connected' | 'not_connected'
    dataSources: {
      toast:   { label: 'Toast (POS / sales)',       apiKey: '', status: 'not_connected' },
      meta:    { label: 'Meta (Facebook/Instagram)', apiKey: '', status: 'not_connected' },
      google:  { label: 'Google (Analytics/Ads)',    apiKey: '', status: 'not_connected' },
      ovation: { label: 'Ovation (reviews)',         apiKey: '', status: 'not_connected' }
    },

    // — Setup progress — the wizard marks this true on Finish so index.html
    // knows onboarding is done and stops force-redirecting to setup.
    setupComplete: false
  };
})();
