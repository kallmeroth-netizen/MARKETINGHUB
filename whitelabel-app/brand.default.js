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
    // Apple-style base: system blue on a clean light-gray canvas, Apple's
    // near-black ink, and Apple system colors for the hub tiles. A brand
    // replaces these in the wizard.
    colors: {
      primary:   '#0071e3',   // Apple blue (buttons, active accents)
      accent:    '#0077ed',   // secondary highlight
      ink:       '#1d1d1f',   // Apple near-black text / logo tint
      bg:        '#f5f5f7',   // Apple light-gray page background
      surface:   '#ffffff',   // cards
      // Hub tile hues — Apple system colors, so tiles read distinct but native.
      yellow:    '#ff9500',   // Apple orange (warm pop)
      green:     '#34c759',   // Apple green
      blue:      '#007aff',   // Apple blue
      lavender:  '#af52de',   // Apple purple
      tan:       '#8e8e93'    // Apple gray
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

    // — Hub tabs — which built-in modules are enabled (all on by default), and
    // any custom tabs the brand added in the wizard. Drives the hub + nav.
    modules: {
      sales:      true,
      pmix:       true,
      calendar:   true,
      influencer: true,
      themes:     true,
      gantt:      true,
      assets:     true
    },
    customTabs: [],   // [{ label, sub, href }] — user-added tabs (external links)

    // Google Calendar feed URL for the calendar's "Add to Google Calendar"
    // button. Empty until the brand adds their own feed.
    calendarFeedUrl: '',

    // — Setup progress — the wizard marks this true on Finish so index.html
    // knows onboarding is done and stops force-redirecting to setup.
    setupComplete: false
  };
})();
