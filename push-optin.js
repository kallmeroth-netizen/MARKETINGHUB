// push-optin.js — "Morning updates" opt-in toggle for the hub.
// Registers the push-only service worker, asks the device for permission,
// subscribes to Web Push, and stores the subscription in Supabase
// (table: push_subscriptions). Requires np-data.js (window.NPData) loaded first.
//
// Drop-in: add a <div id="pushOptIn"></div> where you want the toggle, then
//   <script src="push-optin.js"></script>
// If no #pushOptIn element exists, a small floating pill is created instead.
(function () {
  'use strict';

  // Public VAPID key (safe to ship in the browser). The matching PRIVATE key
  // lives ONLY as a Supabase Edge Function secret — see PUSH-SETUP.md.
  var VAPID_PUBLIC_KEY = 'BDidj2swOHs33H886WSu8VLixQK3gnwboiauVK8lQvbEhmKnYtAviEu2z0yUCIqqTVrG8uECHuLKxu7xVAEFt5w';

  var supported = ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
  var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  function urlB64ToUint8Array(b64) {
    var pad = '='.repeat((4 - (b64.length % 4)) % 4);
    var base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64), arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  var el; // toggle container

  function render(state, note) {
    if (!el) return;
    var on = state === 'on';
    var disabled = state === 'unsupported' || state === 'ios-install';
    el.innerHTML =
      '<button type="button" class="np-push-btn' + (on ? ' on' : '') + (disabled ? ' disabled' : '') + '" ' +
        (disabled ? 'disabled' : '') + '>' +
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>' +
        '<span>' + (on ? 'Morning updates on' : 'Morning updates') + '</span>' +
        (on ? '<span class="np-push-dot"></span>' : '') +
      '</button>' +
      (note ? '<div class="np-push-note">' + note + '</div>' : '');
    var btn = el.querySelector('.np-push-btn');
    if (btn && !disabled) btn.onclick = on ? disable : enable;
  }

  async function currentState() {
    if (!supported) return 'unsupported';
    if (isIOS && !isStandalone) return 'ios-install';
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      var sub = reg && (await reg.pushManager.getSubscription());
      if (sub && Notification.permission === 'granted') return 'on';
    } catch (e) {}
    return 'off';
  }

  async function enable() {
    try {
      render('working', 'Turning on…');
      var perm = await Notification.requestPermission();
      if (perm !== 'granted') { render('off', 'Notifications are blocked — enable them in your browser settings.'); return; }
      var reg = await navigator.serviceWorker.register('push-sw.js');
      await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await saveSubscription(sub);
      render('on', 'You’ll get a 7am recap each morning.');
    } catch (e) {
      console.error('push enable failed', e);
      render('off', 'Could not turn on notifications. Try again.');
    }
  }

  async function disable() {
    try {
      render('working', 'Turning off…');
      var reg = await navigator.serviceWorker.getRegistration();
      var sub = reg && (await reg.pushManager.getSubscription());
      if (sub) { await removeSubscription(sub); await sub.unsubscribe(); }
      render('off', '');
    } catch (e) {
      console.error('push disable failed', e);
      render('on', 'Could not turn off. Try again.');
    }
  }

  async function saveSubscription(sub) {
    var session = await NPData.getSession();
    var json = sub.toJSON();
    var row = {
      user_id: session && session.user ? session.user.id : null,
      endpoint: sub.endpoint,
      p256dh: json.keys && json.keys.p256dh,
      auth: json.keys && json.keys.auth,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
    };
    var res = await NPData.supabase.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    if (res.error) throw res.error;
  }

  async function removeSubscription(sub) {
    try { await NPData.supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('np-push-styles')) return;
    var s = document.createElement('style');
    s.id = 'np-push-styles';
    s.textContent =
      '.np-push-btn{display:inline-flex;align-items:center;gap:7px;font:600 12px/1 "Futura PT Demi","DM Sans",sans-serif;' +
      'letter-spacing:.04em;text-transform:uppercase;color:#3a3d44;background:#fff;border:.5px solid rgba(0,0,0,.12);' +
      'border-radius:100px;padding:9px 14px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:all .15s;}' +
      '.np-push-btn:hover{border-color:#e87142;color:#1f2328;}' +
      '.np-push-btn.on{background:#1f2328;color:#fffdf7;border-color:#1f2328;}' +
      '.np-push-btn.disabled{opacity:.55;cursor:default;}' +
      '.np-push-dot{width:7px;height:7px;border-radius:50%;background:#7bbd91;box-shadow:0 0 0 3px rgba(123,189,145,.25);}' +
      '.np-push-note{font:400 11px/1.4 "DM Sans",system-ui,sans-serif;color:#7a7770;margin-top:6px;max-width:240px;}' +
      '#np-push-float{position:fixed;right:16px;bottom:16px;z-index:900;}';
    document.head.appendChild(s);
  }

  async function init() {
    injectStyles();
    el = document.getElementById('pushOptIn');
    if (!el) { el = document.createElement('div'); el.id = 'np-push-float'; document.body.appendChild(el); }
    var state = await currentState();
    if (state === 'unsupported') { render('unsupported', 'This device doesn’t support push notifications.'); return; }
    if (state === 'ios-install') { render('ios-install', 'On iPhone: tap Share → Add to Home Screen, open it from there, then turn this on.'); return; }
    render(state, '');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
