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
    faviconEmoji: '✳️',

    // — Palette — mapped onto theme.css :root tokens at runtime.
    // Neutral, brand-agnostic defaults. A brand replaces these in the wizard.
    colors: {
      primary:   '#4f46e5',   // buttons, active accents (primary action color)
      accent:    '#0ea5e9',   // secondary highlight
      ink:       '#1f2328',   // primary text / logo tint
      bg:        '#f6f6f8',   // page background
      surface:   '#ffffff',   // cards
      yellow:    '#eab308',   // hub tile family (kept multi-hue so tiles read distinct)
      green:     '#10b981',
      blue:      '#3b82f6',
      lavender:  '#8b5cf6',
      tan:       '#d6b98c'
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
