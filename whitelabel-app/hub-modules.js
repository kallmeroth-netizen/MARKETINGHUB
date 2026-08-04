/* ============================================================
   hub-modules.js — the tab/module catalog (single source of truth)
   ------------------------------------------------------------
   One list of every hub tab, consumed by the sign-in hub (index.html),
   the shared nav (chrome-v2.js), and the setup wizard's "Choose your
   tabs" step (setup.html). Which tabs actually show is driven by the
   brand config: brand.modules[key] (on/off) + brand.customTabs (the
   user's own added tabs). HUB_COMING_SOON is the "to come" list shown
   at the bottom of the picker.

   Each icon is the INNER svg markup (paths only); consumers wrap it in
   an <svg viewBox="0 0 24 24">. Requires brand-config.js loaded first
   (reads window.Brand); degrades to "all on" if absent.
   ============================================================ */
(function () {
  'use strict';

  // Home — always present, not toggleable.
  var HUB_HOME = {
    key:'home', label:'Home', sub:'Hub overview', href:'index.html',
    roles:['team','guest','ops','admin'], bg:'#f3f4f6', stroke:'#1d1d1f',
    icon:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'
  };

  // Admin — always present for admins, not toggleable.
  var HUB_ADMIN = {
    key:'admin', label:'Admin', sub:'Users & setup', href:'admin.html',
    roles:['admin'], bg:'#f3f4f6', stroke:'#1d1d1f',
    icon:'<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M18 14l1.5 1.5L22 13"/>'
  };

  // Toggleable modules — the user picks which of these they want.
  var HUB_MODULES = [
    { key:'sales',      label:'Performance Marketing', sub:'Weekly & all-time KPIs',   href:'dashboard.html', roles:['team','guest','admin'], bg:'#eef4ff', stroke:'#0071e3',
      icon:'<path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h6v6"/>' },
    { key:'pmix',       label:'Sales & Pmix',          sub:'Daily sales & product mix', href:'pmix.html',    roles:['team','guest','admin'], bg:'#eafaf0', stroke:'#34c759',
      icon:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
    { key:'calendar',   label:'Marketing Calendar',    sub:'Campaigns & scheduling',   href:'calendar.html', roles:['team','guest','admin'], bg:'#eef7ff', stroke:'#007aff',
      icon:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>' },
    { key:'influencer', label:'Influencer',            sub:'Creators & seeding',       href:'influencer.html', roles:['team','admin'], bg:'#f6efff', stroke:'#af52de',
      icon:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 3l.9 2.1L22 6l-2.1.9L19 9l-.9-2.1L16 6l2.1-.9z"/>' },
    { key:'themes',     label:'Themes',                sub:'Monthly marketing themes', href:'themes.html',   roles:['team','guest','admin'], bg:'#fff3e6', stroke:'#ff9500',
      icon:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L4 13.8V4h9.4l7.2 7.2a2 2 0 0 1 0 2.2z"/><circle cx="8.5" cy="8.5" r="1.3"/>' },
    { key:'gantt',      label:'Gantt',                 sub:'Timeline & rollout',       href:'gantt.html',    roles:['team','admin'], bg:'#eef2f6', stroke:'#64748b',
      icon:'<path d="M4 6h9M4 12h14M4 18h6"/>' },
    { key:'assets',     label:'Brand Assets',          sub:'Logos & templates',        href:'assets.html',   roles:['team','guest','admin'], bg:'#f3f4f6', stroke:'#8e8e93',
      icon:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>' }
  ];

  // "To come" — shown greyed at the bottom of the tab picker; not selectable yet.
  var HUB_COMING_SOON = [
    { key:'reports',     label:'Reports',      sub:'Scheduled exports' },
    { key:'automations', label:'Automations',  sub:'Triggers & alerts' },
    { key:'paidads',     label:'Paid Ads',     sub:'Spend & ROAS' }
  ];

  function brand() {
    try { return (window.Brand && window.Brand.get()) || {}; } catch (e) { return {}; }
  }

  // Is a toggleable module enabled? Default ON when unset.
  function isEnabled(key) {
    var m = brand().modules || {};
    return m[key] !== false;
  }

  // Custom tabs the user added (each {label, sub, href}), normalized to the
  // same shape as a module with a generic "link" icon.
  function customTabs() {
    var list = (brand().customTabs || []);
    return list.filter(function (t) { return t && t.label && t.href; }).map(function (t, i) {
      return {
        key: 'custom-' + i, label: t.label, sub: t.sub || 'Custom tab', href: t.href,
        roles: ['team','guest','ops','admin'], bg: '#eef4ff', stroke: '#0071e3', external: true,
        icon: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'
      };
    });
  }

  // Build the full ordered hub list for a role: Home → enabled modules →
  // custom tabs → Admin (if admin). Used by index.html and chrome-v2.js.
  function buildHubItems(role) {
    var items = [HUB_HOME];
    HUB_MODULES.forEach(function (m) {
      if (m.roles.indexOf(role) === -1) return;
      if (!isEnabled(m.key)) return;
      items.push(m);
    });
    customTabs().forEach(function (t) { items.push(t); });
    if (role === 'admin') items.push(HUB_ADMIN);
    return items;
  }

  window.HubModules = {
    HOME: HUB_HOME,
    ADMIN: HUB_ADMIN,
    MODULES: HUB_MODULES,
    COMING_SOON: HUB_COMING_SOON,
    isEnabled: isEnabled,
    customTabs: customTabs,
    buildHubItems: buildHubItems
  };
})();
